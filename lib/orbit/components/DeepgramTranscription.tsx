
'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, StopCircle, Volume2 } from 'lucide-react';
import { startDeepgramTranscription, DeepgramTranscriptionSession } from '../services/deepgramTranscriptionService';
import styles from '@/styles/Eburon.module.css';

interface DeepgramTranscriptionProps {
  meetingId: string;
  userId: string;
}

export function DeepgramTranscription({ meetingId, userId }: DeepgramTranscriptionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [finalTranscripts, setFinalTranscripts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<DeepgramTranscriptionSession | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setInterimText('');
    
    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setIsRecording(true);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContext.destination);

      const session = await startDeepgramTranscription(
        meetingId,
        userId,
        (text, isFinal) => {
          if (isFinal) {
            setFinalTranscripts(prev => [...prev.slice(-10), text]); // Keep last 10 for UI
            setInterimText('');
          } else {
            setInterimText(text);
          }
        },
        () => {
          console.log('[Deepgram] Session ended');
          setIsRecording(false);
        }
      );

      sessionRef.current = session;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        
        if (sessionRef.current) {
          session.sendAudio(pcm16.buffer);
        }
      };

    } catch (err: any) {
      console.error('Failed to start transcription:', err);
      setError(err.message || 'Failed to access microphone');
      stopRecording();
    }
  }, [meetingId, userId, stopRecording]);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return (
    <div className="flex flex-col gap-4 p-6 bg-slate-900/50 rounded-3xl border border-white/5 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-slate-600'}`} />
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Deepgram Engine</h2>
        </div>
        
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
            isRecording 
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:bg-rose-500/30' 
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/30'
          }`}
        >
          {isRecording ? <StopCircle size={18} /> : <Mic size={18} />}
          <span className="text-xs font-bold uppercase">{isRecording ? 'Stop Engine' : 'Start Engine'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center">
          {error}
        </div>
      )}

      <div className="min-h-[120px] max-h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {finalTranscripts.map((text, i) => (
          <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-xs text-slate-300 leading-relaxed bg-white/5 p-3 rounded-2xl border border-white/5">
              {text}
            </p>
          </div>
        ))}
        
        {interimText && (
          <div className="animate-pulse">
            <p className="text-xs text-emerald-400/80 italic leading-relaxed pl-3 border-l-2 border-emerald-500/30">
              {interimText}...
            </p>
          </div>
        )}

        {!isRecording && finalTranscripts.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center py-8 opacity-30">
            <Volume2 size={32} className="text-slate-500 mb-2" />
            <p className="text-[10px] uppercase font-bold tracking-tight text-slate-500">Waiting for live audio...</p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-white/5">
        <div className="flex justify-between text-[10px] text-slate-500 font-medium uppercase tracking-tighter">
          <span>Meeting: {meetingId.substring(0, 8)}...</span>
          <span>Status: {isRecording ? 'Streaming & Shipping' : 'Idle'}</span>
        </div>
      </div>
    </div>
  );
}
