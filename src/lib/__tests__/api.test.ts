import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createConversion, getConversions, uploadPDF, updateConversionStatus } from '../api';
import { supabase } from '../supabase';

describe('API Functions', () => {
  const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createConversion', () => {
    it('should create a conversion record', async () => {
      const mockConversion = {
        id: '123',
        file_name: 'test.pdf',
        file_size: 4,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      vi.spyOn(supabase.from('conversions'), 'insert').mockImplementationOnce(() => ({
        select: () => ({
          single: () => Promise.resolve({ data: mockConversion, error: null })
        })
      }));

      const result = await createConversion(mockFile);
      expect(result).toEqual(mockConversion);
    });

    it('should throw error if creation fails', async () => {
      vi.spyOn(supabase.from('conversions'), 'insert').mockImplementationOnce(() => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: new Error('Failed') })
        })
      }));

      await expect(createConversion(mockFile)).rejects.toThrow();
    });
  });

  describe('getConversions', () => {
    it('should return list of conversions', async () => {
      const mockConversions = [
        { id: '1', file_name: 'test1.pdf', status: 'completed' },
        { id: '2', file_name: 'test2.pdf', status: 'pending' }
      ];

      vi.spyOn(supabase.from('conversions'), 'select').mockImplementationOnce(() => ({
        order: () => Promise.resolve({ data: mockConversions, error: null })
      }));

      const result = await getConversions();
      expect(result).toEqual(mockConversions);
    });

    it('should throw error if fetch fails', async () => {
      vi.spyOn(supabase.from('conversions'), 'select').mockImplementationOnce(() => ({
        order: () => Promise.resolve({ data: null, error: new Error('Failed') })
      }));

      await expect(getConversions()).rejects.toThrow();
    });
  });

  describe('uploadPDF', () => {
    it('should upload PDF file', async () => {
      const mockPath = 'pdfs/123/test.pdf';
      
      vi.spyOn(supabase.storage.from('conversions'), 'upload').mockResolvedValueOnce({
        data: { path: mockPath },
        error: null
      });

      const result = await uploadPDF(mockFile, '123');
      expect(result).toBe(mockPath);
    });

    it('should throw error if upload fails', async () => {
      vi.spyOn(supabase.storage.from('conversions'), 'upload').mockResolvedValueOnce({
        data: null,
        error: new Error('Upload failed')
      });

      await expect(uploadPDF(mockFile, '123')).rejects.toThrow();
    });
  });

  describe('updateConversionStatus', () => {
    it('should update conversion status', async () => {
      vi.spyOn(supabase.from('conversions'), 'update').mockImplementationOnce(() => ({
        eq: () => Promise.resolve({ error: null })
      }));

      await expect(updateConversionStatus('123', 'completed')).resolves.not.toThrow();
    });

    it('should throw error if update fails', async () => {
      vi.spyOn(supabase.from('conversions'), 'update').mockImplementationOnce(() => ({
        eq: () => Promise.resolve({ error: new Error('Update failed') })
      }));

      await expect(updateConversionStatus('123', 'completed')).rejects.toThrow();
    });
  });
});