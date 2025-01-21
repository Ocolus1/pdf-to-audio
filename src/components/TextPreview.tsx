import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface TextPreviewProps {
  text: string;
  fileName: string;
}

export function TextPreview({ text, fileName }: TextPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <span className="font-medium">
            Extracted Text from {fileName}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>
        {isExpanded && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {isCopied ? (
              <>
                <Check className="h-4 w-4 text-green-500 dark:text-green-400" />
                <span className="text-green-500 dark:text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>
      {isExpanded && (
        <div className="p-4 dark:bg-gray-800">
          <div className="max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-700/50 rounded p-4">
            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 dark:text-gray-200">
              {text}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}