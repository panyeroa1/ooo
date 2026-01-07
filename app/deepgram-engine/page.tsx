
'use client';

import React, { useEffect, useState } from 'react';
import { DeepgramTranscription } from '@/lib/orbit/components/DeepgramTranscription';

export default function DeepgramEnginePage() {
  const [meetingId, setMeetingId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    // Generate or fetch meeting and user IDs for the session
    const storedMeetingId = sessionStorage.getItem('eburon_meeting_id') || `MEETING_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const storedUserId = sessionStorage.getItem('eburon_user_id') || crypto.randomUUID();
    
    sessionStorage.setItem('eburon_meeting_id', storedMeetingId);
    sessionStorage.setItem('eburon_user_id', storedUserId);
    
    setMeetingId(storedMeetingId);
    setUserId(storedUserId);
  }, []);

  if (!meetingId || !userId) {
    return (
      <div className="min-h-screen bg-[#05070a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-100 font-sans selection:bg-emerald-500/30">
      <div className="max-w-xl mx-auto pt-20 px-6">
        <header className="mb-12 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Vercel Ready Engine</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
            EBURON TRANSCRIPTION
          </h1>
          <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto">
            High-speed Deepgram STT engine with real-time Supabase synchronization.
          </p>
        </header>

        <main className="space-y-8">
          <DeepgramTranscription meetingId={meetingId} userId={userId} />
          
          <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Engine Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-600 uppercase font-bold">STT Model</span>
                <p className="text-xs text-slate-400 font-mono">Deepgram Nova-2</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-slate-600 uppercase font-bold">Database</span>
                <p className="text-xs text-slate-400 font-mono">Supabase Realtime</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-slate-600 uppercase font-bold">Latency</span>
                <p className="text-xs text-slate-400 font-mono">~300ms End-to-End</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-slate-600 uppercase font-bold">Quality</span>
                <p className="text-xs text-slate-400 font-mono">16kHz Mono PCM</p>
              </div>
            </div>
          </div>
        </main>

        <footer className="mt-20 py-8 border-t border-white/5 text-center">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            &copy; 2026 EBURON DEVELOPMENT &bull; POWERED BY DEEPGRAM
          </p>
        </footer>
      </div>
    </div>
  );
}
