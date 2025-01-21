import React, { useCallback, useState, useEffect } from 'react';
import { FileAudio, LogOut } from 'lucide-react';
import { Auth } from './components/Auth';
import { ConversionsList } from './components/ConversionsList';
import { TTSOptions } from './components/TTSOptions';
import { Toast } from './components/Toast';
import { TextPreview } from './components/TextPreview';
import { InputTabs } from './components/InputTabs';
import { ThemeToggle } from './components/ThemeToggle';
import { LandingPage } from './components/LandingPage';
import { useTheme } from './hooks/useTheme';
import { supabase } from './lib/supabase';
import { createConversion, getConversions, uploadPDF, updateConversionStatus, deleteConversion, uploadAudio, saveExtractedText } from './lib/api';
import { textToSpeech, type TTSOptions as TTSOptionsType } from './lib/openai';
import { extractTextFromPDF } from './lib/pdfService';
import type { User } from '@supabase/supabase-js';
import type { Conversion } from './lib/api';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ConversionTask {
  id: string;
  type: 'pdf' | 'text';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  file?: {
    name: string;
    size: number;
    extractedText?: string;
  };
  text?: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string>('');
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [conversionTasks, setConversionTasks] = useState<ConversionTask[]>([]);
  const [isLoadingConversions, setIsLoadingConversions] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ttsOptions, setTTSOptions] = useState<TTSOptionsType>({
    voice: 'nova',
    quality: '128k',
    speed: 1.0
  });
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadConversions();
    }
  }, [user]);

  const loadConversions = async () => {
    try {
      const data = await getConversions();
      setConversions(data);
    } catch (err) {
      console.error('Error loading conversions:', err);
      addToast('Failed to load conversions', 'error');
    } finally {
      setIsLoadingConversions(false);
    }
  };

  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handlePDFDrop = async (files: File[]) => {
    setError('');
    
    const invalidFiles = files.filter(
      file => file.type !== 'application/pdf' || file.size > 50 * 1024 * 1024
    );

    if (invalidFiles.length > 0) {
      setError('Please upload PDF files under 50MB only.');
      return;
    }

    // Create conversion tasks for each file
    const tasks = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      type: 'pdf' as const,
      status: 'pending' as const,
      progress: 0,
      file: {
        name: file.name,
        size: file.size
      }
    }));

    setConversionTasks(prev => [...prev, ...tasks]);
    processFiles(files, tasks);
  };

  const handleTextInput = async (text: string) => {
    const task = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'text' as const,
      status: 'pending' as const,
      progress: 0,
      text
    };

    setConversionTasks(prev => [...prev, task]);
    processText(text, task);
  };

  const processFiles = async (files: File[], tasks: ConversionTask[]) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const task = tasks[i];
      
      try {
        setIsConverting(true);
        
        // Create conversion record
        const conversion = await createConversion(file, ttsOptions);
        
        // Update task status
        updateTaskStatus(task.id, 'processing', 10);
        
        // Upload PDF
        await uploadPDF(file, conversion.id);
        updateTaskStatus(task.id, 'processing', 20);
        
        // Extract text
        const extractionResult = await extractTextFromPDF(file, progress => {
          updateTaskStatus(task.id, 'processing', 20 + (progress * 0.3));
        });
        
        if (!extractionResult.success) {
          throw new Error(extractionResult.error || 'Failed to extract text from PDF');
        }

        // Save extracted text
        await saveExtractedText(conversion.id, extractionResult.text, []);
        updateTaskStatus(task.id, 'processing', 50);

        // Update task with extracted text
        setConversionTasks(prev => 
          prev.map(t => 
            t.id === task.id 
              ? { ...t, file: { ...t.file!, extractedText: extractionResult.text } }
              : t
          )
        );

        // Convert to speech
        const audioBlob = await textToSpeech(
          extractionResult.text,
          ttsOptions,
          progress => {
            updateTaskStatus(task.id, 'processing', 50 + (progress * 0.4));
          }
        );

        // Upload audio
        const audioUrl = await uploadAudio(audioBlob, conversion.id);
        
        // Update conversion status
        await updateConversionStatus(conversion.id, 'completed', {
          audio_url: audioUrl,
          analytics: {
            progress: 100,
            completion_time: new Date().toISOString()
          }
        });

        updateTaskStatus(task.id, 'completed', 100);
        addToast(`Successfully converted ${file.name}`, 'success');
        
        // Reload conversions
        loadConversions();
      } catch (err) {
        console.error('Conversion error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to convert PDF';
        updateTaskStatus(task.id, 'error', 0, errorMessage);
        addToast(errorMessage, 'error');
      }
    }
    setIsConverting(false);
  };

  const processText = async (text: string, task: ConversionTask) => {
    try {
      setIsConverting(true);
      
      // Create conversion record
      const conversion = await createConversion(
        new File([text], 'text-input.txt', { type: 'text/plain' }),
        ttsOptions
      );
      
      updateTaskStatus(task.id, 'processing', 20);
      
      // Save text content
      await saveExtractedText(conversion.id, text, []);
      updateTaskStatus(task.id, 'processing', 40);

      // Convert to speech
      const audioBlob = await textToSpeech(
        text,
        ttsOptions,
        progress => {
          updateTaskStatus(task.id, 'processing', 40 + (progress * 0.5));
        }
      );

      // Upload audio
      const audioUrl = await uploadAudio(audioBlob, conversion.id);
      
      // Update conversion status
      await updateConversionStatus(conversion.id, 'completed', {
        audio_url: audioUrl,
        analytics: {
          progress: 100,
          completion_time: new Date().toISOString()
        }
      });

      updateTaskStatus(task.id, 'completed', 100);
      addToast('Successfully converted text to audio', 'success');
      
      // Reload conversions
      loadConversions();
    } catch (err) {
      console.error('Conversion error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to convert text';
      updateTaskStatus(task.id, 'error', 0, errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsConverting(false);
    }
  };

  const updateTaskStatus = (
    taskId: string,
    status: ConversionTask['status'],
    progress: number,
    error?: string
  ) => {
    setConversionTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? { ...task, status, progress, error }
          : task
      )
    );
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteConversion(id);
      setConversions(prev => prev.filter(conv => conv.id !== id));
      addToast('Conversion deleted successfully', 'success');
    } catch (err) {
      console.error('Error deleting conversion:', err);
      addToast('Failed to delete conversion', 'error');
    }
  };

  const handleStop = async (id: string) => {
    try {
      await updateConversionStatus(id, 'error', {
        error: 'Conversion stopped by user'
      });
      loadConversions();
      addToast('Conversion stopped', 'info');
    } catch (err) {
      console.error('Error stopping conversion:', err);
      addToast('Failed to stop conversion', 'error');
    }
  };

  if (!user) {
    return <LandingPage onAuthSuccess={() => {}} />;
  }

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-950">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <FileAudio className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                PDF to Audiobook
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
              <span className="text-gray-600 dark:text-gray-300">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>

          <div className="max-w-4xl mx-auto space-y-8">
            {/* TTS Options */}
            <TTSOptions
              options={ttsOptions}
              onChange={setTTSOptions}
              disabled={isConverting}
            />

            {/* Input Tabs */}
            <InputTabs
              onPDFDrop={handlePDFDrop}
              onTextSubmit={handleTextInput}
              disabled={isConverting}
            />

            {/* Conversion Tasks */}
            {conversionTasks.length > 0 && (
              <div className="space-y-4 mt-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current Conversions</h3>
                {conversionTasks.map(task => (
                  <div key={task.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileAudio className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {task.type === 'pdf' ? task.file?.name : 'Text Input'}
                          </p>
                          {task.type === 'pdf' && task.file && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {(task.file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`
                        px-3 py-1 rounded-full text-sm font-medium
                        ${task.status === 'completed' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                          : task.status === 'error' 
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                            : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'}
                      `}>
                        {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          task.status === 'completed' 
                            ? 'bg-green-500 dark:bg-green-400' 
                            : task.status === 'error' 
                              ? 'bg-red-500 dark:bg-red-400' 
                              : 'bg-indigo-500 dark:bg-indigo-400'
                        }`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>

                    {/* Error Message */}
                    {task.error && (
                      <p className="text-sm text-red-600 dark:text-red-400">{task.error}</p>
                    )}

                    {/* Text Preview */}
                    {task.type === 'pdf' && task.file?.extractedText && (
                      <TextPreview
                        text={task.file.extractedText}
                        fileName={task.file.name}
                      />
                    )}
                    {task.type === 'text' && task.text && (
                      <TextPreview
                        text={task.text}
                        fileName="Text Input"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Completed Conversions */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Your Conversions</h2>
              <ConversionsList
                conversions={conversions}
                isLoading={isLoadingConversions}
                onDelete={handleDelete}
                onStop={handleStop}
              />
            </div>
          </div>
        </div>

        {/* Toasts */}
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}