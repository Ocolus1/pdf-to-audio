import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConversionsList } from '../ConversionsList';

describe('ConversionsList', () => {
  const mockConversions = [
    {
      id: '1',
      file_name: 'test1.pdf',
      file_size: 1024 * 1024, // 1MB
      status: 'completed' as const,
      created_at: new Date().toISOString(),
      audio_url: 'https://example.com/audio.mp4'
    },
    {
      id: '2',
      file_name: 'test2.pdf',
      file_size: 2 * 1024 * 1024, // 2MB
      status: 'processing' as const,
      created_at: new Date().toISOString()
    }
  ];

  it('should show loading state', () => {
    render(<ConversionsList conversions={[]} isLoading={true} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show empty state when no conversions', () => {
    render(<ConversionsList conversions={[]} isLoading={false} />);
    expect(screen.getByText('No conversions yet')).toBeInTheDocument();
  });

  it('should render list of conversions', () => {
    render(<ConversionsList conversions={mockConversions} isLoading={false} />);
    
    expect(screen.getByText('test1.pdf')).toBeInTheDocument();
    expect(screen.getByText('test2.pdf')).toBeInTheDocument();
    expect(screen.getByText('1.00 MB')).toBeInTheDocument();
    expect(screen.getByText('2.00 MB')).toBeInTheDocument();
  });

  it('should show correct status indicators', () => {
    render(<ConversionsList conversions={mockConversions} isLoading={false} />);
    
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('should show download button for completed conversions', () => {
    render(<ConversionsList conversions={mockConversions} isLoading={false} />);
    
    const downloadButton = screen.getByText('Download');
    expect(downloadButton).toBeInTheDocument();
    expect(downloadButton.closest('a')).toHaveAttribute('href', 'https://example.com/audio.mp4');
  });
});