# Setup Checklist

Follow this checklist to get the transcription and translation services working in your app.

## ✅ Step 1: Environment Variables

Create or update `.env.local` in your project root:

```env
# Required for Deepgram transcription
DEEPGRAM_API_KEY=your_deepgram_api_key

# Required for Ollama translation
OLLAMA_API_KEY=your_ollama_api_key

# Optional: AssemblyAI (alternative transcription provider)
ASSEMBLYAI_API_KEY=your_assemblyai_key
NEXT_PUBLIC_ASSEMBLYAI_API_KEY=your_assemblyai_key
```

### Get API Keys:

- **Deepgram**: https://console.deepgram.com/ (Sign up → Create API Key)
- **Ollama**: Your Ollama/Gemini API key
- **AssemblyAI** (optional): https://www.assemblyai.com/app/signup

## ✅ Step 2: Verify Files Created

Check that these files exist:

```
✅ services/transcriptionService.ts
✅ services/translationService.ts
✅ services/transcribeAndTranslate.ts
✅ services/index.ts
✅ lib/useTranscribeAndTranslate.ts
✅ components/LiveTranscriptionTranslation.tsx
✅ app/api/assemblyai/transcribe/route.ts
✅ examples/integration-examples.tsx
```

## ✅ Step 3: Test Basic Functionality

### Test 1: Check Service Health

```typescript
import { checkServiceHealth } from '@/services';

const health = await checkServiceHealth();
console.log('Status:', health.overall);
```

Expected output: `Status: healthy` or `Status: degraded`

### Test 2: Simple Transcription

```typescript
import { transcribeAudio } from '@/services';

const blob = new Blob(['test'], { type: 'audio/webm' });
const result = await transcribeAudio(blob, { language: 'en' });
console.log('Transcript:', result.transcript);
```

### Test 3: Simple Translation

```typescript
import { translateText } from '@/services';

const result = await translateText('Hello, world!', {
  targetLanguage: 'es',
});
console.log('Translation:', result.translatedText);
```

## ✅ Step 4: Try the Demo Component

Add to a page:

```tsx
// app/demo/page.tsx
import LiveTranscriptionTranslation from '@/components/LiveTranscriptionTranslation';

export default function DemoPage() {
  return <LiveTranscriptionTranslation />;
}
```

Visit: http://localhost:3000/demo

## ✅ Step 5: Integration into Your App

Choose an integration approach:

### Option A: Use the React Hook

```tsx
import { useTranscribeAndTranslate } from '@/lib/useTranscribeAndTranslate';

function MyComponent() {
  const { 
    isListening, 
    currentTranscript, 
    currentTranslation,
    startRealtime, 
    stopRealtime 
  } = useTranscribeAndTranslate({
    targetLanguage: 'es',
  });

  return (
    <button onClick={() => isListening ? stopRealtime() : startRealtime()}>
      {isListening ? 'Stop' : 'Start'}
    </button>
  );
}
```

### Option B: Use Services Directly

```typescript
import { transcribeAndTranslate } from '@/services';

const result = await transcribeAndTranslate(audioBlob, {
  transcription: { language: 'en' },
  translation: { targetLanguage: 'es' },
});
```

### Option C: Use Pre-built Examples

See `examples/integration-examples.tsx` for 8 ready-to-use examples.

## ✅ Step 6: Verify Microphone Permissions

When testing in browser:
1. Click the microphone button
2. Allow microphone access when prompted
3. Speak into your microphone
4. Check console for any errors

## ✅ Step 7: Run Tests

```bash
npm test services/transcriptionService.test.ts
```

Expected: All tests should pass

## ✅ Step 8: Check for Errors

Open browser console and look for:
- ❌ API key errors → Check `.env.local`
- ❌ Network errors → Check internet connection
- ❌ Permission errors → Allow microphone access
- ❌ TypeScript errors → Run `npm run build`

## ✅ Step 9: Monitor Performance

```typescript
import { checkServiceHealth } from '@/services';

const health = await checkServiceHealth();
console.log('Transcription latency:', health.transcription.latency, 'ms');
console.log('Translation latency:', health.translation.latency, 'ms');
```

Expected latency:
- Transcription: 200-500ms
- Translation: 300-800ms

## ✅ Step 10: Deploy

Before deploying to production:

1. ✅ Add environment variables to your hosting platform
2. ✅ Test in production-like environment
3. ✅ Set up error monitoring (Sentry, LogRocket, etc.)
4. ✅ Configure rate limiting if needed
5. ✅ Set up analytics to track usage

## Common Issues & Solutions

### Issue: "Deepgram API key not configured"
**Solution**: Add `DEEPGRAM_API_KEY` to `.env.local` and restart dev server

### Issue: No audio detected
**Solution**: 
- Check microphone permissions in browser
- Verify microphone is working (test in system settings)
- Check console for errors

### Issue: Translation not working
**Solution**: 
- Verify `OLLAMA_API_KEY` is correct
- Check network tab for failed requests
- Try alternative provider

### Issue: High latency
**Solution**:
- Check internet connection speed
- Verify API service status
- Enable caching for translation
- Consider using a different provider

### Issue: TypeScript errors
**Solution**:
```bash
# Clear build cache
rm -rf .next
# Reinstall dependencies
npm install
# Rebuild
npm run build
```

## Troubleshooting Commands

```bash
# Check environment variables are loaded
npm run dev
# Look for: "✓ Ready" message

# Check TypeScript compilation
npm run build

# Run tests
npm test

# Check for linting issues
npm run lint

# Format code
npm run format:write
```

## Production Checklist

Before going live:

- [ ] Environment variables configured on hosting platform
- [ ] API keys have sufficient rate limits
- [ ] Error monitoring set up
- [ ] Analytics tracking implemented
- [ ] Tested with real users
- [ ] Load tested for concurrent users
- [ ] Backup translation provider configured
- [ ] Cache is properly configured
- [ ] HTTPS enabled (required for microphone access)
- [ ] Privacy policy updated (mentions audio processing)

## Support Resources

- 📚 Full Documentation: `services/README.md`
- 🚀 Quick Start: `services/QUICKSTART.md`
- 💡 Examples: `examples/integration-examples.tsx`
- 🧪 Tests: `services/transcriptionService.test.ts`
- 📊 Implementation Summary: `IMPLEMENTATION_SUMMARY.md`

## Success Indicators

You'll know it's working when:

✅ Service health check returns "healthy"
✅ Microphone button starts recording
✅ Transcript appears in real-time
✅ Translation appears shortly after transcript
✅ No errors in browser console
✅ File upload works correctly
✅ Language switching works
✅ Cache is reducing API calls (check network tab)

## Next Steps

1. Customize UI to match your app's design
2. Add additional languages as needed
3. Configure pre-built pipelines for your use cases
4. Set up monitoring and analytics
5. Optimize for your specific workflow
6. Consider adding features like:
   - Export transcripts
   - Save translations
   - Search history
   - User preferences
   - Custom vocabulary

---

**Need help?** Check the documentation files or review the example implementations!
