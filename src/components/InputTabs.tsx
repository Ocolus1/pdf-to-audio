import React, { useState } from 'react';
import { FileText, Type, Upload } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface InputTabsProps {
  onPDFDrop: (files: File[]) => void;
  onTextSubmit: (text: string) => void;
  disabled?: boolean;
}

export function InputTabs({ onPDFDrop, onTextSubmit, disabled = false }: InputTabsProps) {
  const [activeTab, setActiveTab] = useState<'pdf' | 'text'>('pdf');
  const [text, setText] = useState('');
  const [error, setError] = useState<string>('');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onPDFDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 50 * 1024 * 1024,
    multiple: true,
    disabled
  });

  const handleTextSubmit = () => {
    if (!text.trim()) {
      setError('Please enter some text');
      return;
    }
    onTextSubmit(text);
    setText('');
    setError('');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('pdf')}
          className={`
            flex items-center gap-2 px-6 py-3 font-medium text-sm
            ${activeTab === 'pdf'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}
          `}
        >
          <FileText className="h-4 w-4" />
          PDF Upload
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`
            flex items-center gap-2 px-6 py-3 font-medium text-sm
            ${activeTab === 'text'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}
          `}
        >
          <Type className="h-4 w-4" />
          Text Input
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'pdf' ? (
          <div 
            {...getRootProps()} 
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200
              ${isDragActive 
                ? 'border-indigo-500 bg-indigo-50/10 dark:border-indigo-400 dark:bg-indigo-900/20' 
                : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            {isDragActive ? (
              <p className="text-lg text-indigo-600 dark:text-indigo-400">Drop your PDFs here</p>
            ) : (
              <div>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
                  Drag & drop your PDFs here, or click to select
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Maximum file size: 50MB per file
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter or paste your text here..."
              className="w-full h-48 p-4 border border-gray-300 dark:border-gray-600 rounded-lg 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 
                focus:border-indigo-500 dark:focus:border-indigo-400
                placeholder-gray-500 dark:placeholder-gray-400"
              disabled={disabled}
            />
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <button
              onClick={handleTextSubmit}
              disabled={disabled || !text.trim()}
              className={`
                w-full py-3 px-4 rounded-lg font-medium text-white
                transition-colors duration-200
                ${disabled || !text.trim()
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600'
                }
              `}
            >
              Convert to Audio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}