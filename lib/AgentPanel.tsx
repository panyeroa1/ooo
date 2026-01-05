'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from '@/styles/Eburon.module.css';
import { supabase } from '@/lib/orbit/services/supabaseClient';
import { streamTranslation } from '@/lib/orbit/services/geminiService';
import { LANGUAGES, Language, AUTO_DETECT } from '@/lib/orbit/types';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';

interface AgentPanelProps {
  meetingId?: string;
  onSpeakingStateChange?: (isSpeaking: boolean) => void;
}

interface TranslationLog {
  id: string;
  original: string;
  translation: string;
  lang: string;
}

export function AgentPanel({ meetingId, onSpeakingStateChange }: AgentPanelProps) {
  const [targetLang, setTargetLang] = useState<Language>(LANGUAGES.find(l => l.code === 'es-ES') || LANGUAGES[1]);
  const [isMuted, setIsMuted] = useState(false);
  const [logs, setLogs] = useState<TranslationLog[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Notify parent of speaking state
  useEffect(() => {
    onSpeakingStateChange?.(isSpeaking);
  }, [isSpeaking, onSpeakingStateChange]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const queueRef = useRef<any[]>([]);
  const processingRef = useRef(false);
  const processedIdsRef = useRef<Set<string>>(new Set());

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0 || isMuted) return;

    processingRef.current = true;
    const segment = queueRef.current.shift();

    try {
      setIsSpeaking(true);
      const ctx = ensureAudioContext();
      
      // Add 'Processing' log
      const logId = Math.random().toString(36).substring(7);
      setLogs(prev => [...prev, { 
        id: logId, 
        original: segment.source_text, 
        translation: 'Translating...', 
        lang: targetLang.name 
      }]);

      let finalTranslation = '';

      await streamTranslation(
        segment.source_text,
        targetLang.name,
        ctx,
        () => {}, // Audio handled by service
        (text) => {
          // Live update (optional, service sends full text updates)
        },
        (finalText) => {
          finalTranslation = finalText;
          processingRef.current = false;
          setIsSpeaking(false);
          
          // Update log with final
          setLogs(prev => prev.map(l => l.id === logId ? { ...l, translation: finalText } : l));
          
          // Next
          processQueue();
        },
        segment.source_lang || 'auto'
      );
    } catch (e) {
      console.error("Agent translation error:", e);
      processingRef.current = false;
      setIsSpeaking(false);
      processQueue();
    }
  }, [isMuted, targetLang, ensureAudioContext]);

  // Trigger queue processing when unmuted or new items added
  useEffect(() => {
    if (!isMuted && !processingRef.current && queueRef.current.length > 0) {
      processQueue();
    }
  }, [isMuted, processQueue]);

  // Subscribe to transcription
  useEffect(() => {
    if (!meetingId) return;

    const handleRow = (newRow: any) => {
       if (newRow.last_segment_id && processedIdsRef.current.has(newRow.last_segment_id)) return;
       if (newRow.last_segment_id) processedIdsRef.current.add(newRow.last_segment_id);
       
       if (newRow.source_text) {
         queueRef.current.push(newRow);
         processQueue();
       }
    };

    const channel = supabase.channel(`agent:${meetingId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transcript_segments', filter: `meeting_id=eq.${meetingId}` }, 
        (payload) => handleRow(payload.new)
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transcript_segments', filter: `meeting_id=eq.${meetingId}` },
        (payload) => handleRow(payload.new)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, processQueue]);

  return (
    <div className={styles.sidebarPanel}>
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarHeaderText}>
          <h3>Translation Agent</h3>
          <span className={styles.sidebarHeaderMeta}>Reads transcripts aloud</span>
        </div>
        <button 
          onClick={() => {
             const newState = !isMuted;
             setIsMuted(newState);
             if (newState) {
                // Clear queue if muted? Or just pause? Pause is better.
                // If we want to stop current audio, we might need context control.
                if (audioCtxRef.current) audioCtxRef.current.suspend();
             } else {
                ensureAudioContext();
             }
          }}
          className={`${styles.iconButton} ${isMuted ? 'text-slate-500' : 'text-emerald-400'}`}
          title={isMuted ? "Unmute Agent" : "Mute Agent"}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      <div className="px-4 py-3 border-b border-white/5 bg-black/20">
        <label className="block text-xs uppercase text-slate-500 font-bold mb-1.5">Translate To</label>
        <select 
          aria-label="Target language"
          className="w-full bg-[#1a2333] border border-white/10 rounded-md px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          value={targetLang.code}
          onChange={(e) => setTargetLang(LANGUAGES.find(l => l.code === e.target.value) || LANGUAGES[0])}
        >
          {LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.agentBody}>
        <div className={styles.agentMessages}>
          {logs.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm p-8 text-center opacity-60">
                <p>Waiting for speech...</p>
             </div>
          )}
          
          {logs.map((log) => (
            <div key={log.id} className={`${styles.agentMessage} ${styles.agentMessageAssistant} !mb-3`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={styles.agentRole}>Original</span>
              </div>
              <p className="text-xs text-slate-400 italic mb-2 pl-2 border-l-2 border-slate-700">{log.original}</p>
              
              <div className="flex items-center gap-2 mb-1">
                <span className={`${styles.agentRole} !text-emerald-400`}>Agent ({log.lang})</span>
              </div>
              <p className={styles.agentText}>{log.translation}</p>
            </div>
          ))}
          
          {isSpeaking && (
             <div className="flex items-center gap-2 text-xs text-emerald-400 px-2 animate-pulse mt-2">
                <Loader2 size={12} className="animate-spin" />
                Speaking...
             </div>
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
