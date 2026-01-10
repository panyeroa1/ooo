# Quick Start Guide

Get up and running with transcription and translation in 5 minutes.

## 1. Setup Environment Variables

Create a `.env.local` file in your project root:

```env
# Required for transcription
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Required for translation
OLLAMA_API_KEY=your_ollama_api_key_here

# Optional - Additional providers
ASSEMBLYAI_API_KEY=your_assemblyai_key
NEXT_PUBLIC_ASSEMBLYAI_API_KEY=your_assemblyai_key
```

## 2. Quick Examples

### Example 1: Transcribe an Audio File

```typescript
import { transcribeAudio } from '@/services';

// Get audio file from input
const file = event.target.files[0];

// Transcribe
const result = await transcribeAudio(file, {
  language: 'en',
  provider: 'deepgram',
});

console.log(result.transcript);
```

### Example 2: Translate Text

```typescript
import { translateText } from '@/services';

const result = await translateText('Hello, world!', {
  targetLanguage: 'es',
});

console.log(result.translatedText); // "¡Hola, mundo!"
```

### Example 3: Transcribe AND Translate

```typescript
import { transcribeAndTranslate } from '@/services';

const audioFile = event.target.files[0];

const result = await transcribeAndTranslate(audioFile, {
  transcription: { language: 'en' },
  translation: { targetLanguage: 'es' },
});

console.log('Original:', result.transcription.transcript);
console.log('Translated:', result.translation.translatedText);
```

### Example 4: Real-time Voice Translation (Live)

```typescript
import { RealtimeTranscribeAndTranslate } from '@/services';

const service = new RealtimeTranscribeAndTranslate({
  transcription: { language: 'en' },
  translation: { targetLanguage: 'es' },
  onTranscription: (result) => {
    console.log('You said:', result.transcript);
  },
  onTranslation: (result) => {
    console.log('In Spanish:', result.translatedText);
  },
});

// Start listening to microphone
await service.start();

// Stop when done
// service.stop();
```

### Example 5: React Component

```tsx
'use client';

import { useTranscribeAndTranslate } from '@/lib/useTranscribeAndTranslate';

export default function MyComponent() {
  const {
    isListening,
    currentTranscript,
    currentTranslation,
    startRealtime,
    stopRealtime,
  } = useTranscribeAndTranslate({
    targetLanguage: 'es',
    transcriptionLanguage: 'en',
  });

  return (
    <div>
      <button onClick={() => isListening ? stopRealtime() : startRealtime()}>
        {isListening ? '⏹ Stop' : '🎤 Start'}
      </button>

      <div>
        <h3>You said:</h3>
        <p>{currentTranscript}</p>
      </div>

      <div>
        <h3>In Spanish:</h3>
        <p>{currentTranslation}</p>
      </div>
    </div>
  );
}
```

## 3. Use the Demo Component

The project includes a complete demo component:

```tsx
import LiveTranscriptionTranslation from '@/components/LiveTranscriptionTranslation';

export default function Page() {
  return <LiveTranscriptionTranslation />;
}
```

This component includes:
- ✅ Real-time microphone transcription
- ✅ Automatic translation
- ✅ File upload support
- ✅ Service health monitoring
- ✅ Language selection
- ✅ Error handling
- ✅ Result history

## 4. Common Use Cases

### Meeting Transcription
```typescript
import { createPipelineConfig, transcribeAndTranslate } from '@/services';

const config = createPipelineConfig('meeting');
const result = await transcribeAndTranslate(audioFile, config);
```

### Customer Service
```typescript
const config = createPipelineConfig('customer-service');
// Higher retry count and language detection optimized for support calls
```

### Lecture Notes
```typescript
const config = createPipelineConfig('lecture');
// Optimized for long-form content with smart formatting
```

## 5. Test Your Setup

Check if services are working:

```typescript
import { checkServiceHealth } from '@/services';

const health = await checkServiceHealth();

if (health.overall === 'healthy') {
  console.log('✅ All systems operational');
} else {
  console.log('⚠️ Some services unavailable');
  console.log('Transcription:', health.transcription.available);
  console.log('Translation:', health.translation.available);
}
```

## 6. Error Handling

Always wrap calls in try-catch:

```typescript
try {
  const result = await transcribeAndTranslate(audioFile, options);
  // Handle success
} catch (error) {
  console.error('Failed:', error.message);
  // Show user-friendly error message
}
```

## Next Steps

- Read the [full documentation](./README.md)
- Explore the [example component](../components/LiveTranscriptionTranslation.tsx)
- Run tests: `npm test services/transcriptionService.test.ts`
- Check API routes in `app/api/orbit/`

## Troubleshooting

**Problem**: "Deepgram API key not configured"
- **Solution**: Add `DEEPGRAM_API_KEY` to `.env.local`

**Problem**: No audio from microphone
- **Solution**: Check browser permissions for microphone access

**Problem**: Translation not working
- **Solution**: Verify `OLLAMA_API_KEY` is set correctly

**Problem**: High latency
- **Solution**: Check your internet connection and API service status

## Support

For more help, see:
- [Full Documentation](./README.md)
- [API Reference](./README.md#api-reference)
- [Best Practices](./README.md#best-practices)
