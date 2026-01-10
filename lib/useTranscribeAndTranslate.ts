/**
 * React Hook for Transcription and Translation
 * Provides easy-to-use interface for React components
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  transcribeAndTranslate,
  RealtimeTranscribeAndTranslate,
  TranscribeAndTranslateOptions,
  TranscribeAndTranslateResult,
  RealtimeTranscribeAndTranslateOptions,
  checkServiceHealth,
  ServiceHealth,
  createPipelineConfig,
} from '@/services/transcribeAndTranslate';

import type {
  TranscriptionResult,
} from '@/services/transcriptionService';

import type {
  TranslationResult,
} from '@/services/translationService';

export interface UseTranscribeAndTranslateOptions {
  transcriptionProvider?: 'deepgram' | 'assemblyai' | 'web-speech';
  transcriptionLanguage?: string;
  translationProvider?: 'ollama' | 'google' | 'deepl' | 'azure';
  targetLanguage: string;
  autoDetectLanguage?: boolean;
  realtime?: boolean;
  useCache?: boolean;
  onTranscription?: (result: TranscriptionResult) => void;
  onTranslation?: (result: TranslationResult) => void;
}

export interface UseTranscribeAndTranslateReturn {
  // State
  isProcessing: boolean;
  isListening: boolean;
  currentTranscript: string;
  currentTranslation: string;
  error: string | null;
  results: TranscribeAndTranslateResult[];
  serviceHealth: ServiceHealth | null;

  // Actions
  processAudio: (audioBlob: Blob) => Promise<void>;
  startRealtime: (deviceId?: string) => Promise<void>;
  stopRealtime: () => void;
  clearResults: () => void;
  checkHealth: () => Promise<void>;

  // Stats
  totalProcessed: number;
  averageLatency: number;
}

export function useTranscribeAndTranslate(
  options: UseTranscribeAndTranslateOptions
): UseTranscribeAndTranslateReturn {
  const {
    transcriptionProvider = 'deepgram',
    transcriptionLanguage = 'multi',
    translationProvider = 'ollama',
    targetLanguage,
    autoDetectLanguage = true,
    realtime = false,
    useCache = true,
    onTranscription,
    onTranslation,
  } = options;

  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [currentTranslation, setCurrentTranslation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TranscribeAndTranslateResult[]>([]);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth | null>(null);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [totalLatency, setTotalLatency] = useState(0);

  // Refs
  const realtimeServiceRef = useRef<RealtimeTranscribeAndTranslate | null>(null);

  // Calculate average latency
  const averageLatency = totalProcessed > 0 ? totalLatency / totalProcessed : 0;

  // Process a single audio blob
  const processAudio = useCallback(
    async (audioBlob: Blob) => {
      setIsProcessing(true);
      setError(null);

      try {
        const config: TranscribeAndTranslateOptions = {
          transcription: {
            provider: transcriptionProvider,
            language: transcriptionLanguage,
            punctuate: true,
            smartFormat: true,
          },
          translation: {
            targetLanguage,
            provider: translationProvider,
            useCache,
          },
          autoDetectLanguage,
        };

        const result = await transcribeAndTranslate(audioBlob, config);

        // Update state
        setCurrentTranscript(result.transcription.transcript);
        setCurrentTranslation(result.translation.translatedText);
        setResults(prev => [...prev, result]);
        setTotalProcessed(prev => prev + 1);
        setTotalLatency(prev => prev + result.duration);

        // Callbacks
        onTranscription?.(result.transcription);
        onTranslation?.(result.translation);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Processing failed';
        setError(errorMessage);
        console.error('Audio processing error:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      transcriptionProvider,
      transcriptionLanguage,
      translationProvider,
      targetLanguage,
      autoDetectLanguage,
      useCache,
      onTranscription,
      onTranslation,
    ]
  );

  // Start real-time transcription and translation
  const startRealtime = useCallback(
    async (deviceId?: string) => {
      if (isListening) {
        console.warn('Already listening');
        return;
      }

      setError(null);
      setIsListening(true);

      try {
        const config: RealtimeTranscribeAndTranslateOptions = {
          transcription: {
            provider: transcriptionProvider,
            language: transcriptionLanguage,
            punctuate: true,
            smartFormat: true,
          },
          translation: {
            targetLanguage,
            provider: translationProvider,
            useCache,
          },
          autoDetectLanguage,
          onTranscription: (result: TranscriptionResult) => {
            setCurrentTranscript(prev => prev + ' ' + result.transcript);
            onTranscription?.(result);
          },
          onTranslation: (result: TranslationResult) => {
            setCurrentTranslation(prev => prev + ' ' + result.translatedText);
            onTranslation?.(result);
          },
          onError: (err: Error, stage: 'transcription' | 'translation') => {
            const errorMessage = `${stage} error: ${err.message}`;
            setError(errorMessage);
            console.error(errorMessage, err);
          },
        };

        const service = new RealtimeTranscribeAndTranslate(config);
        await service.start(deviceId);
        realtimeServiceRef.current = service;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start';
        setError(errorMessage);
        setIsListening(false);
        console.error('Failed to start realtime service:', err);
      }
    },
    [
      isListening,
      transcriptionProvider,
      transcriptionLanguage,
      translationProvider,
      targetLanguage,
      autoDetectLanguage,
      useCache,
      onTranscription,
      onTranslation,
    ]
  );

  // Stop real-time service
  const stopRealtime = useCallback(() => {
    if (realtimeServiceRef.current) {
      realtimeServiceRef.current.stop();
      realtimeServiceRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Clear results
  const clearResults = useCallback(() => {
    setResults([]);
    setCurrentTranscript('');
    setCurrentTranslation('');
    setError(null);
    setTotalProcessed(0);
    setTotalLatency(0);
  }, []);

  // Check service health
  const checkHealth = useCallback(async () => {
    try {
      const health = await checkServiceHealth();
      setServiceHealth(health);
    } catch (err) {
      console.error('Health check failed:', err);
      setServiceHealth({
        transcription: { available: false, providers: [] },
        translation: { available: false, providers: [] },
        overall: 'unavailable',
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeServiceRef.current) {
        realtimeServiceRef.current.stop();
      }
    };
  }, []);

  // Check health on mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    // State
    isProcessing,
    isListening,
    currentTranscript,
    currentTranslation,
    error,
    results,
    serviceHealth,

    // Actions
    processAudio,
    startRealtime,
    stopRealtime,
    clearResults,
    checkHealth,

    // Stats
    totalProcessed,
    averageLatency,
  };
}

/**
 * Hook for simple transcription only (no translation)
 */
export function useTranscription(options: {
  provider?: 'deepgram' | 'assemblyai' | 'web-speech';
  language?: string;
  realtime?: boolean;
  onTranscript?: (result: TranscriptionResult) => void;
}) {
  const {
    provider = 'deepgram',
    language = 'multi',
    realtime = false,
    onTranscript,
  } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Import dynamically to avoid circular dependencies
  const transcribeAudio = useCallback(
    async (audioBlob: Blob) => {
      setIsProcessing(true);
      setError(null);

      try {
        const { transcribeAudio: transcribe } = await import('@/services/transcriptionService');
        const result = await transcribe(audioBlob, { provider, language });
        
        setTranscript(result.transcript);
        onTranscript?.(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Transcription failed';
        setError(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    },
    [provider, language, onTranscript]
  );

  const startListening = useCallback(async (deviceId?: string) => {
    setIsListening(true);
    setError(null);

    try {
      const { RealtimeTranscription } = await import('@/services/transcriptionService');
      const service = new RealtimeTranscription({
        provider,
        language,
        onTranscript: (result: TranscriptionResult) => {
          setTranscript(prev => prev + ' ' + result.transcript);
          onTranscript?.(result);
        },
        onError: (err: Error) => {
          setError(err.message);
        },
      });

      await service.start(deviceId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start listening';
      setError(errorMessage);
      setIsListening(false);
    }
  }, [provider, language, onTranscript]);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  return {
    isProcessing,
    isListening,
    transcript,
    error,
    transcribeAudio,
    startListening,
    stopListening,
  };
}

/**
 * Hook for simple translation only (no transcription)
 */
export function useTranslation(options: {
  targetLanguage: string;
  sourceLanguage?: string;
  provider?: 'ollama' | 'google' | 'deepl' | 'azure';
  useCache?: boolean;
  onTranslation?: (result: TranslationResult) => void;
}) {
  const {
    targetLanguage,
    sourceLanguage,
    provider = 'ollama',
    useCache = true,
    onTranslation,
  } = options;

  const [isTranslating, setIsTranslating] = useState(false);
  const [translation, setTranslation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(
    async (text: string) => {
      if (!text || !text.trim()) {
        setError('Empty text provided');
        return;
      }

      setIsTranslating(true);
      setError(null);

      try {
        const { translateText } = await import('@/services/translationService');
        const result = await translateText(text, {
          targetLanguage,
          sourceLanguage,
          provider,
          useCache,
        });

        setTranslation(result.translatedText);
        onTranslation?.(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Translation failed';
        setError(errorMessage);
      } finally {
        setIsTranslating(false);
      }
    },
    [targetLanguage, sourceLanguage, provider, useCache, onTranslation]
  );

  return {
    isTranslating,
    translation,
    error,
    translate,
  };
}
