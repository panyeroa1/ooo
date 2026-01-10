/**
 * Translation Service
 * Provides robust translation with multiple provider support,
 * error handling, retry logic, caching, and streaming capabilities.
 */

export interface TranslationOptions {
  targetLanguage: string;
  sourceLanguage?: string;
  provider?: 'ollama' | 'google' | 'deepl' | 'azure';
  model?: string;
  maxRetries?: number;
  retryDelay?: number;
  useCache?: boolean;
  stream?: boolean;
}

export interface TranslationResult {
  translatedText: string;
  sourceLanguage?: string;
  targetLanguage: string;
  provider: string;
  confidence?: number;
  duration?: number;
  cached?: boolean;
}

export interface StreamTranslationOptions extends TranslationOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (result: TranslationResult) => void;
  onError?: (error: Error) => void;
}

/**
 * Error class for translation failures
 */
export class TranslationError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'TranslationError';
  }
}

/**
 * Simple in-memory cache for translations
 */
class TranslationCache {
  private cache = new Map<string, { result: TranslationResult; timestamp: number }>();
  private maxSize = 500;
  private ttl = 3600000; // 1 hour

  private getCacheKey(text: string, targetLang: string, sourceLang?: string): string {
    return `${sourceLang || 'auto'}:${targetLang}:${text}`;
  }

  get(text: string, targetLang: string, sourceLang?: string): TranslationResult | null {
    const key = this.getCacheKey(text, targetLang, sourceLang);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return { ...cached.result, cached: true };
  }

  set(text: string, targetLang: string, result: TranslationResult, sourceLang?: string): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const key = this.getCacheKey(text, targetLang, sourceLang);
    this.cache.set(key, { result, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

const translationCache = new TranslationCache();

/**
 * Retry utility with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`Translation attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Translate text using Ollama/Gemini
 */
export async function translateWithOllama(
  text: string,
  options: TranslationOptions
): Promise<TranslationResult> {
  const {
    targetLanguage,
    sourceLanguage,
    model = 'gemini-3-flash-preview',
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  const translate = async (): Promise<TranslationResult> => {
    const startTime = Date.now();

    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        targetLang: targetLanguage,
        sourceLang: sourceLanguage,
        model,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new TranslationError(
        `Ollama translation error: ${errorText}`,
        'ollama',
        String(response.status),
        response.status >= 500
      );
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    return {
      translatedText: data.translation || text,
      sourceLanguage,
      targetLanguage,
      provider: 'ollama',
      duration,
    };
  };

  return retryWithBackoff(translate, maxRetries, retryDelay);
}

/**
 * Translate text using Ollama with streaming
 */
export async function translateWithOllamaStream(
  text: string,
  options: StreamTranslationOptions
): Promise<void> {
  const {
    targetLanguage,
    sourceLanguage,
    model = 'gemini-3-flash-preview',
    onChunk,
    onComplete,
    onError,
  } = options;

  try {
    const startTime = Date.now();
    const response = await fetch('/api/orbit/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        targetLang: targetLanguage,
        sourceLang: sourceLanguage,
        model,
      }),
    });

    if (!response.ok) {
      throw new TranslationError(
        `Ollama stream translation error: ${response.status}`,
        'ollama',
        String(response.status),
        response.status >= 500
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let fullTranslation = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.message?.content || '';
            if (content) {
              fullTranslation += content;
              onChunk?.(content);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    const duration = Date.now() - startTime;

    onComplete?.({
      translatedText: fullTranslation,
      sourceLanguage,
      targetLanguage,
      provider: 'ollama',
      duration,
    });
  } catch (error) {
    onError?.(error as Error);
    throw error;
  }
}

/**
 * Translate text using Google Cloud Translation (placeholder)
 */
export async function translateWithGoogle(
  text: string,
  options: TranslationOptions
): Promise<TranslationResult> {
  const { targetLanguage, sourceLanguage } = options;

  // This would integrate with Google Cloud Translation API
  // For now, fallback to Ollama
  console.warn('Google Translation not implemented, falling back to Ollama');
  return translateWithOllama(text, options);
}

/**
 * Translate text using DeepL (placeholder)
 */
export async function translateWithDeepL(
  text: string,
  options: TranslationOptions
): Promise<TranslationResult> {
  const { targetLanguage, sourceLanguage } = options;

  // This would integrate with DeepL API
  // For now, fallback to Ollama
  console.warn('DeepL Translation not implemented, falling back to Ollama');
  return translateWithOllama(text, options);
}

/**
 * Translate text using Azure Translator (placeholder)
 */
export async function translateWithAzure(
  text: string,
  options: TranslationOptions
): Promise<TranslationResult> {
  const { targetLanguage, sourceLanguage } = options;

  // This would integrate with Azure Translator API
  // For now, fallback to Ollama
  console.warn('Azure Translation not implemented, falling back to Ollama');
  return translateWithOllama(text, options);
}

/**
 * Main translation function with caching and provider fallback
 */
export async function translateText(
  text: string,
  options: TranslationOptions
): Promise<TranslationResult> {
  const {
    targetLanguage,
    sourceLanguage,
    provider = 'ollama',
    useCache = true,
  } = options;

  // Validate input
  if (!text || !text.trim()) {
    throw new TranslationError('Empty text provided', 'validation', 'EMPTY_TEXT', false);
  }

  if (!targetLanguage) {
    throw new TranslationError('Target language not specified', 'validation', 'NO_TARGET_LANG', false);
  }

  // Check cache
  if (useCache) {
    const cached = translationCache.get(text, targetLanguage, sourceLanguage);
    if (cached) {
      console.log('Translation cache hit');
      return cached;
    }
  }

  // Try providers in order
  const providers = [provider, 'ollama', 'google', 'deepl', 'azure'].filter(
    (p, i, arr) => arr.indexOf(p) === i
  ) as Array<'ollama' | 'google' | 'deepl' | 'azure'>;

  let lastError: Error | null = null;

  for (const currentProvider of providers) {
    try {
      let result: TranslationResult;

      switch (currentProvider) {
        case 'ollama':
          result = await translateWithOllama(text, { ...options, provider: currentProvider });
          break;
        case 'google':
          result = await translateWithGoogle(text, { ...options, provider: currentProvider });
          break;
        case 'deepl':
          result = await translateWithDeepL(text, { ...options, provider: currentProvider });
          break;
        case 'azure':
          result = await translateWithAzure(text, { ...options, provider: currentProvider });
          break;
      }

      // Cache successful translation
      if (useCache) {
        translationCache.set(text, targetLanguage, result, sourceLanguage);
      }

      return result;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Provider ${currentProvider} failed:`, error);

      // If error is not retryable, try next provider
      if (error instanceof TranslationError && !error.retryable) {
        continue;
      }
    }
  }

  throw lastError || new TranslationError(
    'All translation providers failed',
    'all',
    'ALL_FAILED',
    false
  );
}

/**
 * Batch translation with rate limiting
 */
export async function translateBatch(
  texts: string[],
  options: TranslationOptions,
  batchSize: number = 5
): Promise<TranslationResult[]> {
  const results: TranslationResult[] = [];
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(text => translateText(text, options).catch(error => {
        console.error(`Failed to translate: "${text}"`, error);
        // Return original text on error
        return {
          translatedText: text,
          targetLanguage: options.targetLanguage,
          provider: 'fallback',
        } as TranslationResult;
      }))
    );
    results.push(...batchResults);
    
    // Rate limiting delay between batches
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

/**
 * Stream translation function
 */
export async function translateTextStream(
  text: string,
  options: StreamTranslationOptions
): Promise<void> {
  const { provider = 'ollama', stream = true } = options;

  if (!stream || provider !== 'ollama') {
    // Fallback to non-streaming
    try {
      const result = await translateText(text, options);
      options.onComplete?.(result);
    } catch (error) {
      options.onError?.(error as Error);
    }
    return;
  }

  return translateWithOllamaStream(text, options);
}

/**
 * Real-time translation handler for continuous transcription
 */
export class RealtimeTranslator {
  private buffer: string[] = [];
  private translating = false;
  private lastTranslationTime = 0;
  private debounceTimeout: NodeJS.Timeout | null = null;

  constructor(
    private options: TranslationOptions,
    private onTranslation: (result: TranslationResult) => void,
    private debounceMs: number = 1000
  ) {}

  async addText(text: string): Promise<void> {
    this.buffer.push(text);

    // Clear existing timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Debounce translation
    this.debounceTimeout = setTimeout(() => {
      this.flush();
    }, this.debounceMs);
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0 || this.translating) return;

    const textToTranslate = this.buffer.join(' ').trim();
    this.buffer = [];

    if (!textToTranslate) return;

    this.translating = true;

    try {
      const result = await translateText(textToTranslate, this.options);
      this.onTranslation(result);
      this.lastTranslationTime = Date.now();
    } catch (error) {
      console.error('Real-time translation error:', error);
    } finally {
      this.translating = false;
    }
  }

  clear(): void {
    this.buffer = [];
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
  }

  isTranslating(): boolean {
    return this.translating;
  }
}

/**
 * Language detection utility
 */
export async function detectLanguage(text: string): Promise<string> {
  // Simple heuristic-based language detection
  // In production, use a proper language detection API
  
  const patterns: Record<string, RegExp> = {
    en: /^[a-zA-Z\s.,!?'-]+$/,
    es: /[áéíóúñ¿¡]/i,
    fr: /[àâäçèéêëîïôùûü]/i,
    de: /[äöüß]/i,
    zh: /[\u4e00-\u9fa5]/,
    ja: /[\u3040-\u309f\u30a0-\u30ff]/,
    ko: /[\uac00-\ud7af]/,
    ar: /[\u0600-\u06ff]/,
    ru: /[\u0400-\u04ff]/,
  };

  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      return lang;
    }
  }

  return 'auto'; // Unknown
}

/**
 * Get supported languages for a provider
 */
export function getSupportedLanguages(provider: string = 'ollama'): string[] {
  // Common languages supported by most translation services
  const commonLanguages = [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'ko',
    'ar', 'hi', 'nl', 'pl', 'tr', 'vi', 'th', 'id', 'sv', 'no',
    'da', 'fi', 'cs', 'ro', 'hu', 'el', 'he', 'uk', 'bn', 'fa',
  ];

  return commonLanguages;
}

/**
 * Clear translation cache
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; maxSize: number } {
  return {
    size: translationCache.size(),
    maxSize: 500,
  };
}
