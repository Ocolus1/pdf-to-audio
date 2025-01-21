import React from 'react';
import { FileText, Volume2, Upload, CheckCircle, Loader2 } from 'lucide-react';

interface ConversionProgressProps {
  stage: 'upload' | 'extraction' | 'tts' | 'processing';
  progress: number;
  estimatedTime?: number;
}

export function ConversionProgress({ stage, progress, estimatedTime }: ConversionProgressProps) {
  const stages = [
    { id: 'upload', icon: Upload, label: 'Uploading', description: 'Uploading PDF file' },
    { id: 'extraction', icon: FileText, label: 'Extracting', description: 'Extracting text from PDF' },
    { id: 'tts', icon: Volume2, label: 'Converting', description: 'Converting to speech' },
    { id: 'processing', icon: CheckCircle, label: 'Processing', description: 'Finalizing audio' }
  ];

  const currentStageIndex = stages.findIndex(s => s.id === stage);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      {/* Progress Steps */}
      <div className="relative">
        <div className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-200 dark:bg-gray-700 -translate-y-1/2" />
        <div 
          className="absolute left-0 top-1/2 h-0.5 bg-indigo-600 dark:bg-indigo-400 -translate-y-1/2 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
        <div className="relative flex justify-between">
          {stages.map((s, index) => {
            const Icon = s.icon;
            const isActive = index === currentStageIndex;
            const isCompleted = index < currentStageIndex;
            const isCurrent = index === currentStageIndex;
            
            return (
              <div key={s.id} className="flex flex-col items-center">
                <div className={`
                  relative z-10 flex items-center justify-center w-12 h-12 rounded-full
                  transition-all duration-200
                  ${isCompleted 
                    ? 'bg-indigo-600 dark:bg-indigo-500 text-white' 
                    : isActive 
                      ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 ring-4 ring-indigo-50 dark:ring-indigo-900' 
                      : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 ring-4 ring-gray-50 dark:ring-gray-700'}
                `}>
                  {isCurrent ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>
                <div className="mt-3 text-center">
                  <p className={`
                    font-medium mb-1
                    ${isActive 
                      ? 'text-indigo-600 dark:text-indigo-400' 
                      : isCompleted 
                        ? 'text-gray-900 dark:text-gray-100' 
                        : 'text-gray-500 dark:text-gray-400'}
                  `}>
                    {s.label}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {s.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Details */}
      <div className="mt-8">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
          <span>{Math.round(progress)}% Complete</span>
          {estimatedTime && (
            <span>~{Math.ceil(estimatedTime)} seconds remaining</span>
          )}
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}