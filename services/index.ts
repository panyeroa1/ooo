/**
 * Services Export Index
 * Centralized exports for all transcription and translation services
 */

// Transcription Service
export {
  transcribeAudio,
  transcribeWithDeepgram,
  transcribeWithAssemblyAI,
  transcribeWithWebSpeech,
  RealtimeTranscription,
  TranscriptionError,
} from './transcriptionService';

export type {
  TranscriptionOptions,
  TranscriptionResult,
  StreamTranscriptionOptions,
} from './transcriptionService';

// Translation Service
export {
  translateText,
  translateWithOllama,
  translateWithGoogle,
  translateWithDeepL,
  translateWithAzure,
  translateBatch,
  translateTextStream,
  RealtimeTranslator,
  TranslationError,
  detectLanguage,
  getSupportedLanguages,
  clearTranslationCache,
  getCacheStats,
} from './translationService';

export type {
  TranslationOptions,
  TranslationResult,
  StreamTranslationOptions,
} from './translationService';

// Combined Service
export {
  transcribeAndTranslate,
  RealtimeTranscribeAndTranslate,
  batchTranscribeAndTranslate,
  streamTranscribeAndTranslate,
  createPipelineConfig,
  checkServiceHealth,
} from './transcribeAndTranslate';

export type {
  TranscribeAndTranslateOptions,
  TranscribeAndTranslateResult,
  RealtimeTranscribeAndTranslateOptions,
  ServiceHealth,
} from './transcribeAndTranslate';
