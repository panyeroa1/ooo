/**
 * Simple Integration Examples
 * Copy and paste these examples into your components
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranscribeAndTranslate } from '@/lib/useTranscribeAndTranslate';
import { 
  transcribeAudio, 
  translateText, 
  RealtimeTranscribeAndTranslate,
  checkServiceHealth,
  ServiceHealth 
} from '@/services';

// ============================================
// Example 1: Simple Button to Record and Translate
// ============================================

export function SimpleRecordButton() {
  const { isListening, currentTranscript, currentTranslation, startRealtime, stopRealtime } =
    useTranscribeAndTranslate({
      targetLanguage: 'es', // Translate to Spanish
      transcriptionLanguage: 'en',
    });

  return (
    <div>
      <button onClick={() => (isListening ? stopRealtime() : startRealtime())}>
        {isListening ? '⏹ Stop' : '🎤 Record'}
      </button>
      
      <p>You said: {currentTranscript}</p>
      <p>In Spanish: {currentTranslation}</p>
    </div>
  );
}

// ============================================
// Example 2: File Upload Transcription
// ============================================

export function FileUploadTranscription() {
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const result = await transcribeAudio(file, {
        language: 'en',
        provider: 'deepgram',
      });
      setTranscript(result.transcript);
    } catch (error) {
      console.error('Failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" accept="audio/*" onChange={handleFile} disabled={loading} />
      {loading && <p>Processing...</p>}
      {transcript && <p>Transcript: {transcript}</p>}
    </div>
  );
}

// ============================================
// Example 3: Translate Text Input
// ============================================

export function TextTranslator() {
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [language, setLanguage] = useState('es');

  const handleTranslate = async () => {
    if (!text) return;

    try {
      const result = await translateText(text, {
        targetLanguage: language,
        provider: 'ollama',
      });
      setTranslation(result.translatedText);
    } catch (error) {
      console.error('Translation failed:', error);
    }
  };

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to translate..."
      />
      
      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
        <option value="es">Spanish</option>
        <option value="fr">French</option>
        <option value="de">German</option>
        <option value="ja">Japanese</option>
      </select>
      
      <button onClick={handleTranslate}>Translate</button>
      
      {translation && <p>Translation: {translation}</p>}
    </div>
  );
}

// ============================================
// Example 4: Voice-to-Voice Translation
// ============================================

export function VoiceToVoice() {
  const [isActive, setIsActive] = useState(false);
  const [output, setOutput] = useState('');
  const serviceRef = useRef<RealtimeTranscribeAndTranslate | null>(null);

  const start = async () => {
    const service = new RealtimeTranscribeAndTranslate({
      transcription: { language: 'en' },
      translation: { targetLanguage: 'es' },
      onTranslation: (result) => {
        setOutput(result.translatedText);
        // Optional: Use browser's speech synthesis
        const utterance = new SpeechSynthesisUtterance(result.translatedText);
        utterance.lang = 'es-ES';
        window.speechSynthesis.speak(utterance);
      },
    });

    await service.start();
    serviceRef.current = service;
    setIsActive(true);
  };

  const stop = () => {
    serviceRef.current?.stop();
    setIsActive(false);
  };

  return (
    <div>
      <button onClick={isActive ? stop : start}>
        {isActive ? 'Stop Translation' : 'Start Translation'}
      </button>
      <p>Output: {output}</p>
    </div>
  );
}

// ============================================
// Example 5: Batch Process Multiple Files
// ============================================

export function BatchProcessor() {
  const [results, setResults] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setProcessing(true);
    const transcripts: string[] = [];

    for (const file of files) {
      try {
        const result = await transcribeAudio(file, { language: 'en' });
        transcripts.push(`${file.name}: ${result.transcript}`);
      } catch (error) {
        transcripts.push(`${file.name}: ERROR`);
      }
    }

    setResults(transcripts);
    setProcessing(false);
  };

  return (
    <div>
      <input type="file" accept="audio/*" multiple onChange={handleFiles} disabled={processing} />
      {processing && <p>Processing {results.length} files...</p>}
      <ul>
        {results.map((result, i) => (
          <li key={i}>{result}</li>
        ))}
      </ul>
    </div>
  );
}

// ============================================
// Example 6: Live Captions
// ============================================

export function LiveCaptions() {
  const [showTranslation, setShowTranslation] = useState(true);
  
  const { isListening, currentTranscript, currentTranslation, startRealtime, stopRealtime } =
    useTranscribeAndTranslate({
      targetLanguage: 'es',
      autoDetectLanguage: true,
    });

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-80 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => (isListening ? stopRealtime() : startRealtime())}>
            {isListening ? '⏹' : '▶️'} Captions
          </button>
          <button onClick={() => setShowTranslation(!showTranslation)}>
            {showTranslation ? 'Hide' : 'Show'} Translation
          </button>
        </div>
        
        <div className="text-2xl text-center">{currentTranscript}</div>
        
        {showTranslation && (
          <div className="text-xl text-center text-yellow-300 mt-2">
            {currentTranslation}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Example 7: Meeting Notes Generator
// ============================================

export function MeetingNotes() {
  const [notes, setNotes] = useState<string[]>([]);
  
  const { isListening, startRealtime, stopRealtime } = useTranscribeAndTranslate({
    targetLanguage: 'en',
    autoDetectLanguage: true,
    onTranscription: (result) => {
      if (result.isFinal && result.transcript.length > 10) {
        setNotes((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${result.transcript}`]);
      }
    },
  });

  const downloadNotes = () => {
    const text = notes.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-notes-${Date.now()}.txt`;
    a.click();
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => (isListening ? stopRealtime() : startRealtime())}>
          {isListening ? '⏹ Stop Recording' : '🎤 Start Recording'}
        </button>
        <button onClick={downloadNotes} disabled={notes.length === 0}>
          💾 Download Notes
        </button>
        <button onClick={() => setNotes([])} disabled={notes.length === 0}>
          🗑️ Clear
        </button>
      </div>
      
      <div className="border rounded p-4 max-h-96 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-gray-400">No notes yet. Start recording...</p>
        ) : (
          notes.map((note, i) => (
            <div key={i} className="mb-2 p-2 bg-gray-50 rounded">
              {note}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================
// Example 8: Service Health Check
// ============================================

export function HealthCheck() {
  const [health, setHealth] = useState<ServiceHealth | null>(null);

  useEffect(() => {
    checkServiceHealth().then(setHealth);
  }, []);

  if (!health) return <p>Checking...</p>;

  return (
    <div>
      <h3>Service Status: {health.overall}</h3>
      <div>
        Transcription: {health.transcription.available ? '✅' : '❌'}
        {health.transcription.latency && ` (${health.transcription.latency}ms)`}
      </div>
      <div>
        Translation: {health.translation.available ? '✅' : '❌'}
        {health.translation.latency && ` (${health.translation.latency}ms)`}
      </div>
    </div>
  );
}
