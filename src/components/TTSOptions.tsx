import React from 'react';
import { Settings, Volume2 } from 'lucide-react';
import type { TTSOptions } from '../lib/openai';

interface TTSOptionsProps {
  options: TTSOptions;
  onChange: (options: TTSOptions) => void;
  disabled?: boolean;
}

export function TTSOptions({ options, onChange, disabled = false }: TTSOptionsProps) {
  const voices = ['nova', 'alloy', 'echo', 'fable', 'onyx', 'shimmer'] as const;
  const qualities = ['128k', '256k', '320k'] as const;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 mb-2">
        <Settings className="h-5 w-5" />
        <h3 className="font-medium">TTS Options</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Voice
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {voices.map((voice) => (
              <button
                key={voice}
                onClick={() => onChange({ ...options, voice })}
                disabled={disabled}
                className={`
                  flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm
                  transition-colors duration-200
                  ${options.voice === voice
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-medium'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <Volume2 className="h-4 w-4" />
                {voice.charAt(0).toUpperCase() + voice.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Quality
          </label>
          <div className="flex gap-2">
            {qualities.map((quality) => (
              <button
                key={quality}
                onClick={() => onChange({ ...options, quality })}
                disabled={disabled}
                className={`
                  px-3 py-1 rounded-md text-sm
                  transition-colors duration-200
                  ${options.quality === quality
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-medium'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {quality}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Speed ({options.speed}x)
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={options.speed}
            onChange={(e) => onChange({ ...options, speed: parseFloat(e.target.value) })}
            disabled={disabled}
            className="w-full accent-indigo-600 dark:accent-indigo-400"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>0.5x</span>
            <span>2.0x</span>
          </div>
        </div>
      </div>
    </div>
  );
}