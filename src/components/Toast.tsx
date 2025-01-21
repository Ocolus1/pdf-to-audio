import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ 
  message, 
  type = 'info', 
  onClose, 
  duration = 3000 
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    info: <AlertCircle className="h-5 w-5 text-blue-500" />
  };

  const backgrounds = {
    success: 'bg-green-50',
    error: 'bg-red-50',
    info: 'bg-blue-50'
  };

  const borders = {
    success: 'border-green-200',
    error: 'border-red-200',
    info: 'border-blue-200'
  };

  return (
    <div className={`
      fixed bottom-4 right-4 z-50
      flex items-center gap-2
      px-4 py-3 rounded-lg shadow-lg
      border ${borders[type]} ${backgrounds[type]}
      animate-slide-up
    `}>
      {icons[type]}
      <p className="text-gray-700">{message}</p>
      <button
        onClick={onClose}
        className="ml-2 p-1 rounded-full hover:bg-gray-200/50"
      >
        <X className="h-4 w-4 text-gray-500" />
      </button>
    </div>
  );
}