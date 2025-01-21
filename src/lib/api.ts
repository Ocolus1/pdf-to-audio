import { supabase } from './supabase';
import { textToSpeech, type TTSOptions } from './openai';

export interface Conversion {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  created_at: string;
  audio_url?: string;
  error?: string;
  text_content?: string;
  text_chunks?: string[];
  tts_options?: TTSOptions;
  analytics?: {
    processing_time?: number;
    error_count?: number;
    completion_time?: string;
    stage?: 'upload' | 'extraction' | 'tts' | 'processing';
    progress?: number;
  };
}

// Retry operation with exponential backoff
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Estimate processing time based on file size and options
function estimateProcessingTime(fileSize: number, options: TTSOptions): number {
  // Base time in seconds
  let baseTime = 10;

  // Add time based on file size (MB)
  const fileSizeMB = fileSize / (1024 * 1024);
  baseTime += fileSizeMB * 2; // 2 seconds per MB

  // Adjust for quality
  if (options.quality === '256k') baseTime *= 1.5;
  if (options.quality === '320k') baseTime *= 2;

  // Adjust for speed
  if (options.speed && options.speed !== 1.0) {
    baseTime *= (1 / options.speed);
  }

  return Math.ceil(baseTime);
}

export async function createConversion(file: File, ttsOptions?: TTSOptions): Promise<Conversion> {
  return retryOperation(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create a conversion');
    }

    const estimatedTime = estimateProcessingTime(file.size, ttsOptions || {});

    const { data, error } = await supabase
      .from('conversions')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_size: file.size,
        status: 'pending',
        tts_options: ttsOptions,
        analytics: {
          processing_time: estimatedTime,
          error_count: 0,
          stage: 'upload',
          progress: 0
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to create conversion record');
    }
    
    if (!data) {
      throw new Error('No data returned from conversion creation');
    }

    return data;
  });
}

export async function getConversions(): Promise<Conversion[]> {
  return retryOperation(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to get conversions');
    }

    const { data, error } = await supabase
      .from('conversions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  });
}

export async function uploadPDF(file: File, conversionId: string): Promise<string> {
  return retryOperation(async () => {
    const path = `pdfs/${conversionId}/${file.name}`;
    const { error } = await supabase.storage
      .from('conversions')
      .upload(path, file, {
        cacheControl: '3600',
        contentType: 'application/pdf',
        upsert: false
      });

    if (error) throw error;
    return path;
  });
}

export async function uploadAudio(blob: Blob, conversionId: string): Promise<string> {
  return retryOperation(async () => {
    const path = `audio/${conversionId}/audio.mp3`;
    
    // Create a File object from the Blob with proper MIME type
    const audioFile = new File([blob], 'audio.mp3', {
      type: 'audio/mpeg'
    });

    const { error: uploadError } = await supabase.storage
      .from('conversions')
      .upload(path, audioFile, {
        cacheControl: '3600',
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get the download URL using the download method
    const { data } = await supabase.storage
      .from('conversions')
      .createSignedUrl(path, 60 * 60 * 24); // 24 hour expiry

    if (!data?.signedUrl) {
      throw new Error('Failed to generate download URL');
    }

    return data.signedUrl;
  });
}

export async function updateConversionStatus(
  id: string,
  status: Conversion['status'],
  details?: {
    error?: string;
    audio_url?: string;
    analytics?: Conversion['analytics'];
  }
): Promise<void> {
  return retryOperation(async () => {
    const { error } = await supabase
      .from('conversions')
      .update({
        status,
        ...details,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  });
}

export async function deleteConversion(id: string): Promise<void> {
  return retryOperation(async () => {
    // Get the conversion details first
    const { data: conversion, error: fetchError } = await supabase
      .from('conversions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!conversion) throw new Error('Conversion not found');

    // Delete associated files from storage
    const pdfPath = `pdfs/${id}/${conversion.file_name}`;
    const audioPath = `audio/${id}/audio.mp3`;

    await Promise.all([
      supabase.storage.from('conversions').remove([pdfPath]),
      conversion.audio_url ? supabase.storage.from('conversions').remove([audioPath]) : Promise.resolve()
    ]);

    // Delete the conversion record
    const { error: deleteError } = await supabase
      .from('conversions')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
  });
}

export async function saveExtractedText(
  conversionId: string,
  text: string,
  chunks: string[]
): Promise<void> {
  return retryOperation(async () => {
    const { error } = await supabase
      .from('conversions')
      .update({
        text_content: text,
        text_chunks: chunks,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversionId);

    if (error) throw error;
  });
}

export async function getConversionText(conversionId: string): Promise<{
  text: string;
  chunks: string[];
} | null> {
  return retryOperation(async () => {
    const { data, error } = await supabase
      .from('conversions')
      .select('text_content, text_chunks')
      .eq('id', conversionId)
      .single();

    if (error) throw error;
    if (!data?.text_content || !data?.text_chunks) return null;

    return {
      text: data.text_content,
      chunks: data.text_chunks
    };
  });
}