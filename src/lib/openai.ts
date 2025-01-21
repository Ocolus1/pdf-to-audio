import { supabase } from './supabase';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/audio/speech';

export type Voice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
export type AudioQuality = '128k' | '256k' | '320k';

export interface TTSOptions {
  voice?: Voice;
  quality?: AudioQuality;
  speed?: number; // 0.5 to 2.0
}

// Split text into chunks of approximately 4000 characters
export function splitTextIntoChunks(text: string): string[] {
  const MAX_CHUNK_SIZE = 4000;
  const chunks: string[] = [];
  let currentChunk = '';
  
  // Split by sentences (roughly)
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > MAX_CHUNK_SIZE) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += ' ' + sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Combine multiple audio blobs into one
async function combineAudioBlobs(blobs: Blob[]): Promise<Blob> {
  // Convert blobs to array buffers
  const arrayBuffers = await Promise.all(
    blobs.map(blob => blob.arrayBuffer())
  );
  
  // Concatenate array buffers
  const totalLength = arrayBuffers.reduce((acc, buf) => acc + buf.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const buffer of arrayBuffers) {
    combined.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }
  
  return new Blob([combined], { type: 'audio/mpeg' });
}

export async function textToSpeech(
  text: string,
  options: TTSOptions = {},
  onProgress?: (progress: number) => void
): Promise<Blob> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('No text provided for conversion');
  }

  // Split text into manageable chunks
  const chunks = splitTextIntoChunks(text);
  const audioBlobs: Blob[] = [];
  let retryCount = 0;
  const MAX_RETRIES = 3;
  
  for (let i = 0; i < chunks.length; i++) {
    try {
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);
      
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: chunks[i],
          voice: options.voice || 'nova',
          speed: options.speed || 1.0,
          response_format: 'mp3',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `Failed to convert chunk ${i + 1}`);
      }

      const audioBlob = await response.blob();
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error(`Empty audio response for chunk ${i + 1}`);
      }

      audioBlobs.push(audioBlob);
      
      // Update progress
      if (onProgress) {
        onProgress(((i + 1) / chunks.length) * 100);
      }
      
      // Reset retry count on success
      retryCount = 0;
      
      // Add a small delay between chunks to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Error processing chunk ${i + 1}:`, error);
      
      // Retry logic
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        i--; // Retry the same chunk
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        continue;
      }
      
      throw error;
    }
  }

  if (audioBlobs.length === 0) {
    throw new Error('No audio was generated');
  }

  // Combine all audio chunks
  console.log('Combining audio chunks...');
  return combineAudioBlobs(audioBlobs);
}