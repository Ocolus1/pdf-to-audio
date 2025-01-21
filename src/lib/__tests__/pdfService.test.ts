import { describe, it, expect, vi, beforeAll } from 'vitest';
import { extractTextFromPDF, validatePDF } from '../pdfService';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Mock PDF.js
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: {
    workerSrc: ''
  }
}));

// Mock Tesseract.js
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn()
}));

describe('PDF Service', () => {
  const mockPDFData = new Uint8Array([37, 80, 68, 70]); // %PDF magic numbers
  
  beforeAll(() => {
    // Mock PDF.js document
    const mockPage = {
      getTextContent: vi.fn().mockResolvedValue({
        items: [{ str: 'Test content' }]
      }),
      getViewport: vi.fn().mockReturnValue({
        width: 100,
        height: 100
      }),
      render: vi.fn().mockReturnValue({ promise: Promise.resolve() })
    };

    const mockPDFDoc = {
      numPages: 1,
      getPage: vi.fn().mockResolvedValue(mockPage)
    };

    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.resolve(mockPDFDoc)
    });

    // Mock Tesseract worker
    vi.mocked(createWorker).mockResolvedValue({
      loadLanguage: vi.fn().mockResolvedValue(undefined),
      initialize: vi.fn().mockResolvedValue(undefined),
      recognize: vi.fn().mockResolvedValue({ data: { text: 'OCR result' } }),
      terminate: vi.fn().mockResolvedValue(undefined)
    });
  });

  describe('validatePDF', () => {
    it('should validate valid PDF files', () => {
      const validPDF = new File([mockPDFData], 'test.pdf', { type: 'application/pdf' });
      expect(validatePDF(validPDF)).toBe(true);
    });

    it('should reject files over 50MB', () => {
      const largePDF = new File([new ArrayBuffer(51 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      expect(validatePDF(largePDF)).toBe(false);
    });

    it('should reject non-PDF files', () => {
      const nonPDF = new File(['test'], 'test.txt', { type: 'text/plain' });
      expect(validatePDF(nonPDF)).toBe(false);
    });
  });

  describe('extractTextFromPDF', () => {
    it('should extract text from PDF', async () => {
      const mockPDF = new File([mockPDFData], 'test.pdf', { type: 'application/pdf' });
      const result = await extractTextFromPDF(mockPDF);
      expect(result.success).toBe(true);
      expect(result.text).toBeTruthy();
      expect(result.pages).toBeInstanceOf(Array);
    });

    it('should handle invalid PDF files', async () => {
      const invalidPDF = new File(['not a pdf'], 'invalid.pdf', { type: 'application/pdf' });
      const result = await extractTextFromPDF(invalidPDF);
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle OCR when needed', async () => {
      // Mock a page that needs OCR
      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({ items: [] }), // Empty text content
        getViewport: vi.fn().mockReturnValue({
          width: 100,
          height: 100
        }),
        render: vi.fn().mockReturnValue({ promise: Promise.resolve() })
      };

      const mockPDFDoc = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue(mockPage)
      };

      vi.mocked(pdfjsLib.getDocument).mockReturnValueOnce({
        promise: Promise.resolve(mockPDFDoc)
      });

      const mockPDF = new File([mockPDFData], 'scanned.pdf', { type: 'application/pdf' });
      const result = await extractTextFromPDF(mockPDF);
      
      expect(result.success).toBe(true);
      expect(result.text).toContain('OCR result');
    });
  });
});