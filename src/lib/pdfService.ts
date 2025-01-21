import { createWorker } from 'tesseract.js';
import pdfToText from 'react-pdftotext';

const MIN_TEXT_LENGTH = 50; // Minimum characters to consider valid text
const MAX_OCR_RETRIES = 3;
const OCR_TIMEOUT = 60000; // 60 seconds

export enum PDFError {
  INVALID_FILE = 'INVALID_FILE',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  OCR_FAILED = 'OCR_FAILED',
  TIMEOUT = 'TIMEOUT',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT'
}

export class PDFProcessingError extends Error {
  constructor(
    public code: PDFError,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PDFProcessingError';
  }
}

interface ExtractionResult {
  success: boolean;
  text?: string;
  error?: string;
  errorCode?: PDFError;
}

export function validatePDF(file: File): true {
  if (!file || !(file instanceof File)) {
    throw new PDFProcessingError(
      PDFError.INVALID_FILE,
      'Invalid file provided'
    );
  }

  if (file.type !== 'application/pdf') {
    throw new PDFProcessingError(
      PDFError.INVALID_FILE,
      'File must be a PDF document'
    );
  }

  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    throw new PDFProcessingError(
      PDFError.INVALID_FILE,
      'File size exceeds 50MB limit'
    );
  }

  if (file.size === 0) {
    throw new PDFProcessingError(
      PDFError.INVALID_FILE,
      'File is empty'
    );
  }

  return true;
}

async function extractTextWithPDFToText(file: File): Promise<string> {
  try {
    const text = await pdfToText(file);
    return text;
  } catch (error) {
    throw new PDFProcessingError(
      PDFError.EXTRACTION_FAILED,
      'Failed to extract text using PDFToText',
      error
    );
  }
}

async function performOCR(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const worker = await createWorker();
  let text = '';
  let retryCount = 0;

  try {
    await worker.loadLanguage('eng');
    await worker.initialize('eng');

    // Convert PDF to image for OCR
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not create canvas context');
    }

    // Create a URL for the PDF file
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      setTimeout(() => reject(new Error('Image loading timeout')), 10000);
    });

    canvas.width = img.width;
    canvas.height = img.height;
    context.drawImage(img, 0, 0);

    while (retryCount < MAX_OCR_RETRIES) {
      try {
        const { data: { text: ocrText } } = await Promise.race([
          worker.recognize(canvas),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('OCR timeout')), OCR_TIMEOUT)
          )
        ]);

        text += ocrText + '\n';
        if (onProgress) {
          onProgress((retryCount + 1) / MAX_OCR_RETRIES * 100);
        }
        break;
      } catch (error) {
        retryCount++;
        if (retryCount === MAX_OCR_RETRIES) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    URL.revokeObjectURL(url);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}

export async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ExtractionResult> {
  try {
    validatePDF(file);
  } catch (error) {
    if (error instanceof PDFProcessingError) {
      return {
        success: false,
        error: error.message,
        errorCode: error.code
      };
    }
    throw error;
  }

  try {
    // First try with PDFToText
    console.log('Attempting text extraction with PDFToText...');
    if (onProgress) onProgress(10);
    
    const text = await extractTextWithPDFToText(file);
    if (onProgress) onProgress(40);

    // Clean up the extracted text
    const cleanedText = text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\S\r\n]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n');

    // If not enough text was extracted, try OCR
    if (cleanedText.length < MIN_TEXT_LENGTH) {
      console.log('Insufficient text extracted, attempting OCR...');
      if (onProgress) onProgress(50);
      
      try {
        const ocrText = await performOCR(file, (progress) => {
          if (onProgress) onProgress(50 + (progress * 0.4));
        });
        
        if (ocrText.length < MIN_TEXT_LENGTH) {
          throw new PDFProcessingError(
            PDFError.UNSUPPORTED_FORMAT,
            'Could not extract sufficient text from the PDF, even with OCR'
          );
        }

        return {
          success: true,
          text: ocrText
        };
      } catch (error) {
        throw new PDFProcessingError(
          PDFError.OCR_FAILED,
          'OCR processing failed',
          error
        );
      }
    }

    return {
      success: true,
      text: cleanedText
    };
  } catch (error) {
    console.error('PDF processing error:', error);
    
    if (error instanceof PDFProcessingError) {
      return {
        success: false,
        error: error.message,
        errorCode: error.code
      };
    }

    return {
      success: false,
      error: 'An unexpected error occurred while processing the PDF',
      errorCode: PDFError.EXTRACTION_FAILED
    };
  }
}