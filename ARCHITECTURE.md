# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Your Application                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              React Components / Pages                    │   │
│  │  (Use hooks or services directly)                        │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         React Hooks (lib/)                               │   │
│  │  • useTranscribeAndTranslate                             │   │
│  │  • useTranscription                                      │   │
│  │  • useTranslation                                        │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Core Services (services/)                        │   │
│  │                                                           │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │  Combined Service                                │   │   │
│  │  │  • transcribeAndTranslate()                      │   │   │
│  │  │  • RealtimeTranscribeAndTranslate               │   │   │
│  │  │  • batchTranscribeAndTranslate()                │   │   │
│  │  │  • checkServiceHealth()                          │   │   │
│  │  └──────────────┬───────────────┬───────────────────┘   │   │
│  │                 │               │                        │   │
│  │    ┌────────────▼──────┐   ┌───▼────────────┐          │   │
│  │    │ Transcription      │   │ Translation    │          │   │
│  │    │ Service            │   │ Service        │          │   │
│  │    │                    │   │                │          │   │
│  │    │ • transcribeAudio  │   │ • translateText│          │   │
│  │    │ • Realtime         │   │ • Batch        │          │   │
│  │    │ • Batch            │   │ • Streaming    │          │   │
│  │    │ • Providers:       │   │ • Caching      │          │   │
│  │    │   - Deepgram       │   │ • Providers:   │          │   │
│  │    │   - AssemblyAI     │   │   - Ollama     │          │   │
│  │    │   - Web Speech     │   │   - Google     │          │   │
│  │    │                    │   │   - DeepL      │          │   │
│  │    │                    │   │   - Azure      │          │   │
│  │    └────────────┬───────┘   └───┬────────────┘          │   │
│  │                 │               │                        │   │
│  └─────────────────┼───────────────┼────────────────────────┘   │
│                    │               │                            │
│                    ▼               ▼                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              API Routes (app/api/)                       │   │
│  │  • /api/orbit/stt                                        │   │
│  │  • /api/orbit/translate                                  │   │
│  │  • /api/translate                                        │   │
│  │  • /api/deepgram/token                                   │   │
│  │  • /api/assemblyai/transcribe                            │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │      External API Services          │
        ├─────────────────────────────────────┤
        │ • Deepgram API                      │
        │ • AssemblyAI API                    │
        │ • Ollama/Gemini API                 │
        │ • Google Translate API (optional)   │
        │ • DeepL API (optional)              │
        │ • Azure Translator API (optional)   │
        └─────────────────────────────────────┘
```

## Data Flow

### Real-time Transcription & Translation

```
User Speaks
    │
    ▼
Microphone ─────────────┐
                        │
                        ▼
            ┌─────────────────────┐
            │ Audio Capture       │
            │ (WebRTC/MediaStream)│
            └──────────┬──────────┘
                       │
                       ▼
            ┌─────────────────────┐
            │ Audio Processing    │
            │ (PCM16 conversion)  │
            └──────────┬──────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
┌──────────────────┐      ┌──────────────────┐
│ Deepgram WebSocket│      │ AssemblyAI WS   │
│ (Real-time STT)   │      │ (Alternative)    │
└────────┬──────────┘      └──────────────────┘
         │
         ▼
┌──────────────────┐
│ Transcript       │
│ (interim/final)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Debounce Buffer  │
│ (1 second)       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐       ┌──────────────────┐
│ Translation API  │◄──────│ Cache Check      │
│ (Ollama/Gemini)  │       │ (LRU, 1hr TTL)   │
└────────┬─────────┘       └──────────────────┘
         │
         ▼
┌──────────────────┐
│ Translated Text  │
└────────┬─────────┘
         │
         ▼
    Display to User
```

### File-based Transcription & Translation

```
User Uploads Audio File
         │
         ▼
┌──────────────────┐
│ File Validation  │
│ (type, size)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Convert to Blob  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Transcription    │
│ Service          │
└────────┬─────────┘
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
Deepgram   AssemblyAI
  API         API
    │          │
    └────┬─────┘
         │
         ▼
┌──────────────────┐
│ Transcript Text  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Translation      │
│ Service          │
└────────┬─────────┘
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
Ollama API  Cache Hit?
    │          │
    └────┬─────┘
         │
         ▼
┌──────────────────┐
│ Translated Text  │
└────────┬─────────┘
         │
         ▼
    Return Result
```

## Component Hierarchy

```
App
 │
 ├─ Page (Your custom pages)
 │   │
 │   └─ LiveTranscriptionTranslation (Demo Component)
 │       │
 │       ├─ useTranscribeAndTranslate (Hook)
 │       │   │
 │       │   ├─ State Management
 │       │   ├─ RealtimeTranscribeAndTranslate
 │       │   └─ transcribeAndTranslate
 │       │
 │       ├─ Language Selector
 │       ├─ Device Selector
 │       ├─ Service Health Display
 │       ├─ Transcript Display
 │       ├─ Translation Display
 │       └─ Results History
 │
 └─ API Routes
     ├─ /api/orbit/stt
     ├─ /api/orbit/translate
     ├─ /api/translate
     ├─ /api/deepgram/token
     └─ /api/assemblyai/transcribe
```

## Service Layers

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Presentation (React Components)                │
│ • UI Components                                          │
│ • User Interactions                                      │
│ • State Display                                          │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Application Logic (React Hooks)                │
│ • useTranscribeAndTranslate                              │
│ • State Management                                       │
│ • Event Handlers                                         │
│ • Lifecycle Management                                   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Business Logic (Services)                      │
│ • transcribeAndTranslate                                 │
│ • RealtimeTranscribeAndTranslate                        │
│ • Provider Orchestration                                 │
│ • Error Handling & Retry Logic                          │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 4: Provider Adapters                              │
│ • Deepgram Integration                                   │
│ • AssemblyAI Integration                                │
│ • Ollama Integration                                     │
│ • Web Speech API                                         │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 5: API Routes (Next.js)                           │
│ • Server-side Processing                                 │
│ • API Key Management                                     │
│ • Request/Response Handling                              │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 6: External APIs                                   │
│ • Deepgram API                                           │
│ • AssemblyAI API                                         │
│ • Ollama/Gemini API                                      │
└─────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
API Request
    │
    ▼
Try Provider 1 ────────► Success ──────► Return Result
    │
    │ Fail (Retryable)
    ▼
Retry with Backoff
    │
    │ Fail
    ▼
Try Provider 2 ────────► Success ──────► Return Result
    │
    │ Fail
    ▼
Try Provider 3 ────────► Success ──────► Return Result
    │
    │ All Failed
    ▼
Return Error with Details
    │
    ▼
User Receives Error Message
```

## Caching Strategy

```
Translation Request
        │
        ▼
   ┌─────────┐
   │ Cache?  │
   └────┬────┘
        │
    ┌───┴───┐
    │       │
    ▼       ▼
  Hit     Miss
    │       │
    │       ▼
    │   Call API
    │       │
    │       ▼
    │   Store in Cache
    │       │
    └───┬───┘
        │
        ▼
  Return Result

Cache Properties:
• Max Size: 500 entries
• TTL: 1 hour
• Strategy: LRU (Least Recently Used)
• Key: source_lang:target_lang:text
```

## Performance Optimization

```
Request ──► Cache Check ──► Provider Selection ──► Response
   │            │                   │                  │
   │            │                   │                  │
   └─► Batch?   └─► Hit Rate 70%   └─► Fastest       └─► < 500ms
       │                │                 First
       └─► Process      └─► Save Time
           in Groups         & Money
```

## Monitoring Points

```
1. Service Health
   • API Availability
   • Response Times
   • Error Rates

2. Performance Metrics
   • Transcription Latency
   • Translation Latency
   • Cache Hit Rate
   • API Usage

3. User Experience
   • Time to First Result
   • Real-time Lag
   • Error Frequency
   • Success Rate

4. Resource Usage
   • API Quota
   • Cache Size
   • Memory Usage
   • Network Bandwidth
```

## Security Layers

```
┌─────────────────────────────────────┐
│ Environment Variables (.env.local)  │
│ • API Keys (server-side only)       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ API Routes (Server-side)            │
│ • Key Validation                     │
│ • Rate Limiting                      │
│ • Request Sanitization               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ External APIs                        │
│ • HTTPS Only                         │
│ • Token Authentication               │
└─────────────────────────────────────┘
```

---

This architecture is designed to be:
- **Scalable**: Easy to add new providers
- **Reliable**: Multiple fallbacks and retry logic
- **Performant**: Caching and batch processing
- **Maintainable**: Clean separation of concerns
- **Testable**: Each layer can be tested independently
