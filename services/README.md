# Transcription and Translation Services

Robust, production-ready speech-to-text transcription and translation services with multiple provider support, error handling, retry logic, and caching.

## Features

### Transcription
- **Multiple Providers**: Deepgram, AssemblyAI, Web Speech API
- **Real-time & Batch Processing**: Support for both live streaming and file-based transcription
- **Automatic Fallback**: Falls back to alternative providers on failure
- **Retry Logic**: Exponential backoff for transient failures
- **Language Detection**: Auto-detect source language

### Translation
- **Multiple Providers**: Ollama/Gemini, Google, DeepL, Azure
- **Streaming Support**: Real-time translation with streaming responses
- **Smart Caching**: In-memory LRU cache for repeated translations
- **Batch Processing**: Efficient processing of multiple translations
- **Rate Limiting**: Built-in rate limiting for API calls

### Combined Pipeline
- **End-to-End**: Transcribe audio and translate in one call
- **Real-time Mode**: Live transcription with automatic translation
- **Health Monitoring**: Check service availability and latency
- **Presets**: Pre-configured pipelines for common use cases

## Installation

The services are already included in your project. No additional installation required.

Required environment variables:

```env
# Deepgram (for transcription)
DEEPGRAM_API_KEY=your_deepgram_key

# AssemblyAI (optional, for transcription)
ASSEMBLYAI_API_KEY=your_assemblyai_key
NEXT_PUBLIC_ASSEMBLYAI_API_KEY=your_assemblyai_key

# Ollama (for translation)
OLLAMA_API_KEY=your_ollama_key
```

## Usage

### 1. Basic Transcription

```typescript
import { transcribeAudio } from '@/services/transcriptionService';

// Transcribe an audio file
const audioBlob = new Blob([audioData], { type: 'audio/webm' });
const result = await transcribeAudio(audioBlob, {
  provider: 'deepgram',
  language: 'en',
  punctuate: true,
  smartFormat: true,
});

console.log(result.transcript);
console.log(`Confidence: ${result.confidence}`);
console.log(`Duration: ${result.duration}ms`);
```

### 2. Basic Translation

```typescript
import { translateText } from '@/services/translationService';

const result = await translateText('Hello, how are you?', {
  targetLanguage: 'es',
  provider: 'ollama',
  useCache: true,
});

console.log(result.translatedText); // "Hola, ¿cómo estás?"
```

### 3. Combined Transcription + Translation

```typescript
import { transcribeAndTranslate } from '@/services/transcribeAndTranslate';

const audioBlob = new Blob([audioData], { type: 'audio/webm' });
const result = await transcribeAndTranslate(audioBlob, {
  transcription: {
    provider: 'deepgram',
    language: 'multi',
    detectLanguage: true,
  },
  translation: {
    targetLanguage: 'en',
    provider: 'ollama',
    useCache: true,
  },
  autoDetectLanguage: true,
});

console.log('Original:', result.transcription.transcript);
console.log('Translated:', result.translation.translatedText);
```

### 4. Real-time Transcription

```typescript
import { RealtimeTranscription } from '@/services/transcriptionService';

const transcription = new RealtimeTranscription({
  provider: 'deepgram',
  language: 'en',
  onTranscript: (result) => {
    if (result.isFinal) {
      console.log('Final:', result.transcript);
    } else {
      console.log('Interim:', result.transcript);
    }
  },
  onError: (error) => {
    console.error('Transcription error:', error);
  },
});

// Start listening
await transcription.start();

// Stop when done
transcription.stop();
```

### 5. Real-time Transcription + Translation

```typescript
import { RealtimeTranscribeAndTranslate } from '@/services/transcribeAndTranslate';

const service = new RealtimeTranscribeAndTranslate({
  transcription: {
    provider: 'deepgram',
    language: 'multi',
  },
  translation: {
    targetLanguage: 'en',
    provider: 'ollama',
  },
  onTranscription: (result) => {
    console.log('Transcribed:', result.transcript);
  },
  onTranslation: (result) => {
    console.log('Translated:', result.translatedText);
  },
  onError: (error, stage) => {
    console.error(`${stage} error:`, error);
  },
});

await service.start();

// Later...
service.stop();
```

### 6. Using React Hooks

```typescript
import { useTranscribeAndTranslate } from '@/lib/useTranscribeAndTranslate';

function MyComponent() {
  const {
    isListening,
    currentTranscript,
    currentTranslation,
    error,
    startRealtime,
    stopRealtime,
  } = useTranscribeAndTranslate({
    transcriptionProvider: 'deepgram',
    targetLanguage: 'es',
    autoDetectLanguage: true,
  });

  return (
    <div>
      <button onClick={() => startRealtime()}>
        {isListening ? 'Stop' : 'Start'}
      </button>
      
      {error && <div className="error">{error}</div>}
      
      <div>Transcript: {currentTranscript}</div>
      <div>Translation: {currentTranslation}</div>
    </div>
  );
}
```

### 7. Batch Processing

```typescript
import { translateBatch } from '@/services/translationService';

const texts = [
  'Hello',
  'How are you?',
  'Good morning',
  'Thank you',
];

const results = await translateBatch(texts, {
  targetLanguage: 'es',
  provider: 'ollama',
}, 5); // Batch size of 5

results.forEach((result, i) => {
  console.log(`${texts[i]} → ${result.translatedText}`);
});
```

### 8. Streaming Translation

```typescript
import { translateTextStream } from '@/services/translationService';

await translateTextStream('Long text to translate...', {
  targetLanguage: 'es',
  provider: 'ollama',
  stream: true,
  onChunk: (chunk) => {
    process.stdout.write(chunk); // Stream output as it arrives
  },
  onComplete: (result) => {
    console.log('\nComplete:', result.translatedText);
  },
  onError: (error) => {
    console.error('Error:', error);
  },
});
```

### 9. Health Monitoring

```typescript
import { checkServiceHealth } from '@/services/transcribeAndTranslate';

const health = await checkServiceHealth();

console.log('Overall:', health.overall); // 'healthy', 'degraded', or 'unavailable'
console.log('Transcription available:', health.transcription.available);
console.log('Translation available:', health.translation.available);
console.log('Transcription latency:', health.transcription.latency);
```

### 10. Pre-configured Pipelines

```typescript
import { createPipelineConfig, transcribeAndTranslate } from '@/services/transcribeAndTranslate';

// Use a pre-configured pipeline for meetings
const meetingConfig = createPipelineConfig('meeting');

const result = await transcribeAndTranslate(audioBlob, meetingConfig);

// Available presets: 'meeting', 'interview', 'lecture', 'customer-service'
```

## API Reference

### Transcription Service

#### `transcribeAudio(audioBlob, options)`
Transcribe an audio blob with automatic provider fallback.

**Options:**
- `provider`: `'deepgram' | 'assemblyai' | 'web-speech'` (default: `'deepgram'`)
- `language`: Language code (default: `'multi'`)
- `model`: Model to use (default: `'nova-2'` for Deepgram)
- `punctuate`: Add punctuation (default: `true`)
- `detectLanguage`: Auto-detect language (default: `false`)
- `smartFormat`: Smart formatting (default: `true`)
- `maxRetries`: Maximum retry attempts (default: `3`)
- `retryDelay`: Base retry delay in ms (default: `1000`)

**Returns:** `Promise<TranscriptionResult>`

#### `RealtimeTranscription`
Class for real-time audio transcription.

**Methods:**
- `start(deviceId?)`: Start listening
- `stop()`: Stop listening
- `isListening()`: Check if currently listening

### Translation Service

#### `translateText(text, options)`
Translate text with automatic provider fallback and caching.

**Options:**
- `targetLanguage`: Target language code (required)
- `sourceLanguage`: Source language code (optional)
- `provider`: `'ollama' | 'google' | 'deepl' | 'azure'` (default: `'ollama'`)
- `model`: Model to use (default: `'gemini-3-flash-preview'`)
- `useCache`: Enable caching (default: `true`)
- `maxRetries`: Maximum retry attempts (default: `3`)
- `retryDelay`: Base retry delay in ms (default: `1000`)

**Returns:** `Promise<TranslationResult>`

#### `translateBatch(texts, options, batchSize)`
Translate multiple texts efficiently.

**Returns:** `Promise<TranslationResult[]>`

#### `RealtimeTranslator`
Class for real-time translation with debouncing.

**Methods:**
- `addText(text)`: Add text to translation queue
- `flush()`: Force immediate translation
- `clear()`: Clear queue
- `isTranslating()`: Check if currently translating

### Combined Service

#### `transcribeAndTranslate(audioBlob, options)`
Transcribe and translate audio in one call.

**Returns:** `Promise<TranscribeAndTranslateResult>`

#### `RealtimeTranscribeAndTranslate`
Class for real-time transcription with automatic translation.

**Methods:**
- `start(deviceId?)`: Start service
- `stop()`: Stop service
- `isRunning()`: Check if running

### React Hooks

#### `useTranscribeAndTranslate(options)`
Complete hook for transcription and translation.

**Returns:**
- `isProcessing`: Processing state
- `isListening`: Listening state
- `currentTranscript`: Current transcript
- `currentTranslation`: Current translation
- `error`: Error message
- `results`: History of results
- `serviceHealth`: Service health status
- `processAudio(blob)`: Process audio file
- `startRealtime(deviceId?)`: Start real-time
- `stopRealtime()`: Stop real-time
- `clearResults()`: Clear history
- `checkHealth()`: Check service health

## Error Handling

All services throw specific error types:

```typescript
import { TranscriptionError, TranslationError } from '@/services/...';

try {
  await transcribeAudio(blob);
} catch (error) {
  if (error instanceof TranscriptionError) {
    console.error('Provider:', error.provider);
    console.error('Code:', error.code);
    console.error('Retryable:', error.retryable);
  }
}
```

## Caching

Translation results are automatically cached in memory (LRU cache, max 500 entries, 1 hour TTL).

```typescript
import { clearTranslationCache, getCacheStats } from '@/services/translationService';

// Clear cache
clearTranslationCache();

// Get cache stats
const stats = getCacheStats();
console.log(`Cache: ${stats.size}/${stats.maxSize}`);
```

## Language Codes

Common language codes supported:
- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German
- `it` - Italian
- `pt` - Portuguese
- `zh` - Chinese
- `ja` - Japanese
- `ko` - Korean
- `ar` - Arabic
- `ru` - Russian
- `hi` - Hindi
- `multi` - Multi-language (auto-detect)

## Best Practices

1. **Use caching** for repeated translations
2. **Enable auto-detect** for unknown source languages
3. **Use batch processing** for multiple items
4. **Monitor service health** before critical operations
5. **Handle errors gracefully** with user feedback
6. **Cleanup real-time services** in component unmount
7. **Use appropriate batch sizes** to avoid rate limits
8. **Test provider fallback** in development

## Performance Tips

- Deepgram is fastest for transcription
- Enable caching for translation to reduce API calls
- Use batch processing for multiple items
- Stream translations for better UX on long texts
- Use pre-configured pipelines for common scenarios

## Troubleshooting

### No transcription output
- Check microphone permissions
- Verify API keys are configured
- Check service health status
- Look for errors in console

### Translation not working
- Verify target language is supported
- Check API key configuration
- Clear cache if getting stale results
- Try different provider

### High latency
- Check network connection
- Monitor service health for latency
- Use streaming for better perceived performance
- Consider caching for repeated content

## Example Component

See [LiveTranscriptionTranslation.tsx](../components/LiveTranscriptionTranslation.tsx) for a complete working example with UI.

## Support

For issues or questions, check:
1. Console logs for detailed error messages
2. Service health status
3. API key configuration
4. Network connectivity
