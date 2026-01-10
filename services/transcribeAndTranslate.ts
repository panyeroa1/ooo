/**
 * Combined Transcription and Translation Service
 * Provides end-to-end speech-to-text with automatic translation
 */

import {
  transcribeAudio,
  RealtimeTranscription,
  TranscriptionOptions,
  TranscriptionResult,
  StreamTranscriptionOptions,
  TranscriptionError,
} from './transcriptionService';

import {
  translateText,
  translateTextStream,
  RealtimeTranslator,
  TranslationOptions,
  TranslationResult,
  StreamTranslationOptions,
  TranslationError,
  detectLanguage,
} from './translationService';

export interface TranscribeAndTranslateOptions {
  transcription: TranscriptionOptions;
  translation: TranslationOptions;
  autoDetectLanguage?: boolean;
}

export interface TranscribeAndTranslateResult {
  transcription: TranscriptionResult;
  translation: TranslationResult;
  duration: number;
}

export interface RealtimeTranscribeAndTranslateOptions {
  transcription: StreamTranscriptionOptions;
  translation: TranslationOptions;
  autoDetectLanguage?: boolean;
  onTranscription?: (result: TranscriptionResult) => void;
  onTranslation?: (result: TranslationResult) => void;
  onError?: (error: Error, stage: 'transcription' | 'translation') => void;
}

/**
 * Transcribe audio and translate the result
 */
export async function transcribeAndTranslate(
  audioBlob: Blob,
  options: TranscribeAndTranslateOptions
): Promise<TranscribeAndTranslateResult> {
  const startTime = Date.now();

  try {
    // Step 1: Transcribe audio
    const transcriptionResult = await transcribeAudio(audioBlob, options.transcription);

    if (!transcriptionResult.transcript || !transcriptionResult.transcript.trim()) {
      throw new Error('Transcription returned empty text');
    }

    // Step 2: Detect language if needed
    let sourceLanguage = options.transcription.language;
    if (options.autoDetectLanguage && transcriptionResult.language) {
      sourceLanguage = transcriptionResult.language;
    } else if (options.autoDetectLanguage) {
      sourceLanguage = await detectLanguage(transcriptionResult.transcript);
    }

    // Step 3: Translate
    const translationOptions: TranslationOptions = {
      ...options.translation,
      sourceLanguage,
    };

    const translationResult = await translateText(
      transcriptionResult.transcript,
      translationOptions
    );

    const duration = Date.now() - startTime;

    return {
      transcription: transcriptionResult,
      translation: translationResult,
      duration,
    };
  } catch (error) {
    console.error('Transcribe and translate error:', error);
    throw error;
  }
}

/**
 * Real-time transcription with automatic translation
 */
export class RealtimeTranscribeAndTranslate {
  private transcription: RealtimeTranscription;
  private translator: RealtimeTranslator;
  private isActive = false;

  constructor(private options: RealtimeTranscribeAndTranslateOptions) {
    // Setup transcription
    this.transcription = new RealtimeTranscription({
      ...options.transcription,
      onTranscript: this.handleTranscript.bind(this),
      onInterimTranscript: this.handleInterimTranscript.bind(this),
      onError: (error) => {
        options.onError?.(error, 'transcription');
      },
    });

    // Setup translator
    this.translator = new RealtimeTranslator(
      options.translation,
      (result) => {
        options.onTranslation?.(result);
      },
      1000 // 1 second debounce
    );
  }

  private handleTranscript(result: TranscriptionResult): void {
    // Notify caller
    this.options.onTranscription?.(result);

    // Add to translation queue
    if (result.transcript && result.isFinal) {
      this.translator.addText(result.transcript);
    }
  }

  private handleInterimTranscript(text: string): void {
    // Optionally handle interim transcripts
    // For now, we only translate final transcripts
  }

  async start(deviceId?: string): Promise<void> {
    if (this.isActive) {
      throw new Error('Already active');
    }

    try {
      await this.transcription.start(deviceId);
      this.isActive = true;
    } catch (error) {
      this.options.onError?.(error as Error, 'transcription');
      throw error;
    }
  }

  stop(): void {
    if (!this.isActive) return;

    this.transcription.stop();
    this.translator.flush(); // Flush any pending translations
    this.translator.clear();
    this.isActive = false;
  }

  isRunning(): boolean {
    return this.isActive;
  }
}

/**
 * Batch process multiple audio files with transcription and translation
 */
export async function batchTranscribeAndTranslate(
  audioBlobs: Blob[],
  options: TranscribeAndTranslateOptions,
  concurrency: number = 3
): Promise<TranscribeAndTranslateResult[]> {
  const results: TranscribeAndTranslateResult[] = [];
  const errors: Error[] = [];

  // Process in batches
  for (let i = 0; i < audioBlobs.length; i += concurrency) {
    const batch = audioBlobs.slice(i, i + concurrency);
    
    const batchResults = await Promise.allSettled(
      batch.map(blob => transcribeAndTranslate(blob, options))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('Batch processing error:', result.reason);
        errors.push(result.reason);
      }
    }

    // Rate limiting between batches
    if (i + concurrency < audioBlobs.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (errors.length > 0) {
    console.warn(`${errors.length} of ${audioBlobs.length} files failed processing`);
  }

  return results;
}

/**
 * Stream-based transcribe and translate for continuous audio
 */
export async function streamTranscribeAndTranslate(
  audioStream: MediaStream,
  options: RealtimeTranscribeAndTranslateOptions
): Promise<RealtimeTranscribeAndTranslate> {
  const service = new RealtimeTranscribeAndTranslate(options);
  await service.start();
  return service;
}

/**
 * Create a pipeline configuration for common use cases
 */
export function createPipelineConfig(
  useCase: 'meeting' | 'interview' | 'lecture' | 'customer-service'
): TranscribeAndTranslateOptions {
  const configs: Record<string, TranscribeAndTranslateOptions> = {
    meeting: {
      transcription: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'multi',
        punctuate: true,
        smartFormat: true,
        detectLanguage: true,
      },
      translation: {
        targetLanguage: 'en',
        provider: 'ollama',
        useCache: true,
      },
      autoDetectLanguage: true,
    },
    interview: {
      transcription: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'en',
        punctuate: true,
        smartFormat: true,
      },
      translation: {
        targetLanguage: 'en',
        provider: 'ollama',
        useCache: true,
      },
      autoDetectLanguage: false,
    },
    lecture: {
      transcription: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'multi',
        punctuate: true,
        smartFormat: true,
        detectLanguage: true,
      },
      translation: {
        targetLanguage: 'en',
        provider: 'ollama',
        useCache: true,
      },
      autoDetectLanguage: true,
    },
    'customer-service': {
      transcription: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'multi',
        punctuate: true,
        smartFormat: true,
        detectLanguage: true,
      },
      translation: {
        targetLanguage: 'en',
        provider: 'ollama',
        useCache: true,
        maxRetries: 5,
      },
      autoDetectLanguage: true,
    },
  };

  return configs[useCase] || configs.meeting;
}

/**
 * Monitor service health and performance
 */
export interface ServiceHealth {
  transcription: {
    available: boolean;
    providers: string[];
    latency?: number;
  };
  translation: {
    available: boolean;
    providers: string[];
    latency?: number;
  };
  overall: 'healthy' | 'degraded' | 'unavailable';
}

export async function checkServiceHealth(): Promise<ServiceHealth> {
  const health: ServiceHealth = {
    transcription: {
      available: false,
      providers: [],
    },
    translation: {
      available: false,
      providers: [],
    },
    overall: 'unavailable',
  };

  // Test transcription
  try {
    const testBlob = new Blob(['test'], { type: 'audio/webm' });
    const startTime = Date.now();
    
    // Quick check if API is available
    const response = await fetch('/api/deepgram/token', { method: 'GET' });
    if (response.ok) {
      health.transcription.available = true;
      health.transcription.providers.push('deepgram');
      health.transcription.latency = Date.now() - startTime;
    }
  } catch (error) {
    console.warn('Transcription health check failed:', error);
  }

  // Test translation
  try {
    const startTime = Date.now();
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'test', targetLang: 'es' }),
    });
    
    if (response.ok) {
      health.translation.available = true;
      health.translation.providers.push('ollama');
      health.translation.latency = Date.now() - startTime;
    }
  } catch (error) {
    console.warn('Translation health check failed:', error);
  }

  // Determine overall health
  if (health.transcription.available && health.translation.available) {
    health.overall = 'healthy';
  } else if (health.transcription.available || health.translation.available) {
    health.overall = 'degraded';
  } else {
    health.overall = 'unavailable';
  }

  return health;
}

/**
 * Export all utilities
 */
export {
  transcribeAudio,
  translateText,
  RealtimeTranscription,
  RealtimeTranslator,
  TranscriptionError,
  TranslationError,
  detectLanguage,
};

export type {
  TranscriptionOptions,
  TranscriptionResult,
  StreamTranscriptionOptions,
  TranslationOptions,
  TranslationResult,
  StreamTranslationOptions,
};
