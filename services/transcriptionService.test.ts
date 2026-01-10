/**
 * Test Suite for Transcription and Translation Services
 * Run with: npm test services/transcriptionService.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

describe('Transcription Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('transcribeWithDeepgram', () => {
    it('should transcribe audio successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          transcript: 'Hello world',
          confidence: 0.95,
        }),
      };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const { transcribeWithDeepgram } = await import('./transcriptionService');
      const blob = new Blob(['test'], { type: 'audio/webm' });
      
      const result = await transcribeWithDeepgram(blob);

      expect(result.transcript).toBe('Hello world');
      expect(result.confidence).toBe(0.95);
      expect(result.provider).toBe('deepgram');
      expect(result.isFinal).toBe(true);
    });

    it('should retry on failure', async () => {
      const mockError = {
        ok: false,
        status: 500,
        text: async () => 'Server error',
      };
      const mockSuccess = {
        ok: true,
        json: async () => ({
          transcript: 'Success after retry',
          confidence: 0.9,
        }),
      };

      (global.fetch as any)
        .mockResolvedValueOnce(mockError)
        .mockResolvedValueOnce(mockSuccess);

      const { transcribeWithDeepgram } = await import('./transcriptionService');
      const blob = new Blob(['test'], { type: 'audio/webm' });
      
      const result = await transcribeWithDeepgram(blob, { maxRetries: 1, retryDelay: 100 });

      expect(result.transcript).toBe('Success after retry');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('RealtimeTranscription', () => {
    it('should create and manage realtime connection', async () => {
      const { RealtimeTranscription } = await import('./transcriptionService');
      
      const onTranscript = vi.fn();
      const transcription = new RealtimeTranscription({
        provider: 'deepgram',
        onTranscript,
      });

      expect(transcription.isListening()).toBe(false);
    });
  });
});

describe('Translation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('translateWithOllama', () => {
    it('should translate text successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          translation: 'Hola mundo',
        }),
      };
      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const { translateWithOllama } = await import('./translationService');
      
      const result = await translateWithOllama('Hello world', {
        targetLanguage: 'es',
      });

      expect(result.translatedText).toBe('Hola mundo');
      expect(result.targetLanguage).toBe('es');
      expect(result.provider).toBe('ollama');
    });

    it('should handle translation errors', async () => {
      const mockError = {
        ok: false,
        status: 500,
        text: async () => 'Translation failed',
      };
      (global.fetch as any).mockResolvedValueOnce(mockError);

      const { translateWithOllama, TranslationError } = await import('./translationService');
      
      await expect(
        translateWithOllama('Hello', {
          targetLanguage: 'es',
          maxRetries: 0,
        })
      ).rejects.toThrow(TranslationError);
    });
  });

  describe('translateText with caching', () => {
    it('should cache translation results', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          translation: 'Bonjour',
        }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const { translateText, clearTranslationCache } = await import('./translationService');
      
      // Clear cache first
      clearTranslationCache();

      // First call - should hit API
      const result1 = await translateText('Hello', {
        targetLanguage: 'fr',
        useCache: true,
      });

      // Second call - should use cache
      const result2 = await translateText('Hello', {
        targetLanguage: 'fr',
        useCache: true,
      });

      expect(result1.translatedText).toBe('Bonjour');
      expect(result2.cached).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only called once
    });
  });

  describe('translateBatch', () => {
    it('should translate multiple texts', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          translation: 'Translated',
        }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const { translateBatch, clearTranslationCache } = await import('./translationService');
      
      clearTranslationCache();

      const texts = ['Hello', 'World', 'Test'];
      const results = await translateBatch(texts, {
        targetLanguage: 'es',
      }, 2); // Batch size of 2

      expect(results).toHaveLength(3);
      expect(results[0].translatedText).toBe('Translated');
    });
  });

  describe('detectLanguage', () => {
    it('should detect English text', async () => {
      const { detectLanguage } = await import('./translationService');
      const lang = await detectLanguage('Hello world');
      expect(lang).toBe('en');
    });

    it('should detect Spanish text', async () => {
      const { detectLanguage } = await import('./translationService');
      const lang = await detectLanguage('Hola mundo ñ');
      expect(lang).toBe('es');
    });

    it('should detect Chinese text', async () => {
      const { detectLanguage } = await import('./translationService');
      const lang = await detectLanguage('你好世界');
      expect(lang).toBe('zh');
    });
  });
});

describe('Combined Transcription and Translation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('transcribeAndTranslate', () => {
    it('should transcribe and translate audio', async () => {
      const mockTranscription = {
        ok: true,
        json: async () => ({
          transcript: 'Hello world',
          confidence: 0.95,
        }),
      };

      const mockTranslation = {
        ok: true,
        json: async () => ({
          translation: 'Hola mundo',
        }),
      };

      (global.fetch as any)
        .mockResolvedValueOnce(mockTranscription)
        .mockResolvedValueOnce(mockTranslation);

      const { transcribeAndTranslate } = await import('./transcribeAndTranslate');
      const blob = new Blob(['test'], { type: 'audio/webm' });
      
      const result = await transcribeAndTranslate(blob, {
        transcription: {
          provider: 'deepgram',
          language: 'en',
        },
        translation: {
          targetLanguage: 'es',
          provider: 'ollama',
        },
      });

      expect(result.transcription.transcript).toBe('Hello world');
      expect(result.translation.translatedText).toBe('Hola mundo');
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('RealtimeTranscribeAndTranslate', () => {
    it('should handle real-time pipeline', async () => {
      const { RealtimeTranscribeAndTranslate } = await import('./transcribeAndTranslate');
      
      const onTranscription = vi.fn();
      const onTranslation = vi.fn();

      const service = new RealtimeTranscribeAndTranslate({
        transcription: {
          provider: 'deepgram',
          language: 'en',
        },
        translation: {
          targetLanguage: 'es',
          provider: 'ollama',
        },
        onTranscription,
        onTranslation,
      });

      expect(service.isRunning()).toBe(false);
    });
  });

  describe('checkServiceHealth', () => {
    it('should check service availability', async () => {
      const mockDeepgramHealth = {
        ok: true,
        json: async () => ({ token: 'test' }),
      };

      const mockOllamaHealth = {
        ok: true,
        json: async () => ({ translation: 'test' }),
      };

      (global.fetch as any)
        .mockResolvedValueOnce(mockDeepgramHealth)
        .mockResolvedValueOnce(mockOllamaHealth);

      const { checkServiceHealth } = await import('./transcribeAndTranslate');
      const health = await checkServiceHealth();

      expect(health.overall).toBe('healthy');
      expect(health.transcription.available).toBe(true);
      expect(health.translation.available).toBe(true);
    });

    it('should report degraded status when one service fails', async () => {
      const mockSuccess = {
        ok: true,
        json: async () => ({ token: 'test' }),
      };

      const mockFailure = {
        ok: false,
        status: 500,
      };

      (global.fetch as any)
        .mockResolvedValueOnce(mockSuccess)
        .mockResolvedValueOnce(mockFailure);

      const { checkServiceHealth } = await import('./transcribeAndTranslate');
      const health = await checkServiceHealth();

      expect(health.overall).toBe('degraded');
    });
  });

  describe('createPipelineConfig', () => {
    it('should create meeting config', async () => {
      const { createPipelineConfig } = await import('./transcribeAndTranslate');
      const config = createPipelineConfig('meeting');

      expect(config.transcription.provider).toBe('deepgram');
      expect(config.translation.targetLanguage).toBe('en');
      expect(config.autoDetectLanguage).toBe(true);
    });

    it('should create customer-service config', async () => {
      const { createPipelineConfig } = await import('./transcribeAndTranslate');
      const config = createPipelineConfig('customer-service');

      expect(config.transcription.detectLanguage).toBe(true);
      expect(config.translation.maxRetries).toBe(5);
    });
  });
});

describe('Error Handling', () => {
  it('should throw TranscriptionError with proper details', async () => {
    const { TranscriptionError } = await import('./transcriptionService');
    
    const error = new TranscriptionError(
      'Test error',
      'deepgram',
      '500',
      true
    );

    expect(error.name).toBe('TranscriptionError');
    expect(error.provider).toBe('deepgram');
    expect(error.code).toBe('500');
    expect(error.retryable).toBe(true);
  });

  it('should throw TranslationError with proper details', async () => {
    const { TranslationError } = await import('./translationService');
    
    const error = new TranslationError(
      'Test error',
      'ollama',
      'API_ERROR',
      false
    );

    expect(error.name).toBe('TranslationError');
    expect(error.provider).toBe('ollama');
    expect(error.code).toBe('API_ERROR');
    expect(error.retryable).toBe(false);
  });
});

describe('Cache Management', () => {
  it('should clear cache', async () => {
    const { clearTranslationCache, getCacheStats } = await import('./translationService');
    
    clearTranslationCache();
    const stats = getCacheStats();

    expect(stats.size).toBe(0);
  });

  it('should report cache stats', async () => {
    const { getCacheStats } = await import('./translationService');
    const stats = getCacheStats();

    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('maxSize');
    expect(stats.maxSize).toBe(500);
  });
});
