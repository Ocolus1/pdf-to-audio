import React, { useState } from 'react';
import { FileAudio, AlertCircle, CheckCircle, Clock, Loader2, Trash2, StopCircle, Play, Pause } from 'lucide-react';
import { ConversionProgress } from './ConversionProgress';
import type { Conversion } from '../lib/api';

interface ConversionsListProps {
  conversions: Conversion[];
  isLoading: boolean;
  onDelete?: (id: string) => void;
  onStop?: (id: string) => void;
}

export function ConversionsList({ 
  conversions, 
  isLoading, 
  onDelete,
  onStop 
}: ConversionsListProps) {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioElements] = useState(new Map<string, HTMLAudioElement>());

  const handlePlay = (conversionId: string, audioUrl: string) => {
    // Stop any currently playing audio
    if (currentlyPlaying && currentlyPlaying !== conversionId) {
      const currentAudio = audioElements.get(currentlyPlaying);
      if (currentAudio) {
        currentAudio.pause();
      }
    }

    // Get or create audio element
    let audioElement = audioElements.get(conversionId);
    if (!audioElement) {
      audioElement = new Audio(audioUrl);
      audioElements.set(conversionId, audioElement);
      
      // Add ended event listener
      audioElement.addEventListener('ended', () => {
        setCurrentlyPlaying(null);
      });
    }

    if (currentlyPlaying === conversionId) {
      audioElement.pause();
      setCurrentlyPlaying(null);
    } else {
      audioElement.play();
      setCurrentlyPlaying(conversionId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-spin" role="progressbar" />
      </div>
    );
  }

  if (conversions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No conversions yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {conversions.map((conversion) => (
        <div
          key={conversion.id}
          className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileAudio className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{conversion.file_name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {(conversion.file_size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {conversion.status === 'pending' && (
                <>
                  <Clock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-300">Pending</span>
                </>
              )}
              {conversion.status === 'processing' && (
                <>
                  <Loader2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                  <span className="text-indigo-600 dark:text-indigo-400">Processing</span>
                  {onStop && (
                    <button
                      onClick={() => onStop(conversion.id)}
                      className="ml-2 p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                      title="Stop processing"
                    >
                      <StopCircle className="h-5 w-5" />
                    </button>
                  )}
                </>
              )}
              {conversion.status === 'completed' && (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400">Completed</span>
                  {conversion.audio_url && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePlay(conversion.id, conversion.audio_url!)}
                        className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full"
                        title={currentlyPlaying === conversion.id ? "Pause" : "Play"}
                      >
                        {currentlyPlaying === conversion.id ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5" />
                        )}
                      </button>
                      {/* <a
                        href={conversion.audio_url}
                        download
                        className="px-3 py-1 text-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                      >
                        Download
                      </a> */}
                    </div>
                  )}
                </>
              )}
              {conversion.status === 'error' && (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
                  <span className="text-red-600 dark:text-red-400">
                    {conversion.error || 'Error occurred'}
                  </span>
                </>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(conversion.id)}
                  className="ml-2 p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                  title="Delete conversion"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Show progress for processing conversions */}
          {conversion.status === 'processing' && conversion.analytics && (
            <ConversionProgress
              stage={conversion.analytics.stage || 'upload'}
              progress={conversion.analytics.progress || 0}
              estimatedTime={
                conversion.analytics.processing_time
                  ? (conversion.analytics.processing_time * 1000 - (Date.now() - new Date(conversion.created_at).getTime())) / 1000
                  : undefined
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}