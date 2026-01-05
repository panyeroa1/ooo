'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as orbitService from '@/lib/orbit/services/orbitService';
import { toast } from 'react-hot-toast';
import styles from './OrbitTranslator.module.css';
import { OrbitSubtitleOverlay } from './OrbitSubtitleOverlay';

// Orbit Planet Icon SVG
const OrbitIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="planetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60666e" />
        <stop offset="50%" stopColor="#3d4147" />
        <stop offset="100%" stopColor="#1a1c1f" />
      </linearGradient>
      <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#888" stopOpacity="0.3" />
        <stop offset="50%" stopColor="#ccc" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#888" stopOpacity="0.3" />
      </linearGradient>
    </defs>
    {/* Ring behind planet */}
    <ellipse cx="16" cy="16" rx="14" ry="5" stroke="url(#ringGradient)" strokeWidth="1.5" fill="none" transform="rotate(-20 16 16)" />
    {/* Planet sphere */}
    <circle cx="16" cy="16" r="9" fill="url(#planetGradient)" />
    {/* Ring in front (clipped) */}
    <path d="M 2 16 Q 16 21, 30 16" stroke="url(#ringGradient)" strokeWidth="1.5" fill="none" transform="rotate(-20 16 16)" />
  </svg>
);

interface OrbitTranslatorVerticalProps {
  roomCode: string;
  userId: string;
  onLiveTextChange?: (text: string) => void;
}

import { supabase } from '@/lib/orbit/services/supabaseClient';
import { LANGUAGES } from '@/lib/orbit/types';

export function OrbitTranslatorVertical({ roomCode, userId, onLiveTextChange }: OrbitTranslatorVerticalProps) {
  // -- Original State --
  const [mode, setMode] = useState<'idle' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState('');
  const [liveText, setLiveText] = useState('');
  const [isLockedByOther, setIsLockedByOther] = useState(false);
  const [roomUuid, setRoomUuid] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // -- Translation & TTS State --
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [isListening, setIsListening] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  
  // Audio Playback State
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const processingQueueRef = useRef<any[]>([]);
  const isProcessingRef = useRef(false);

  // Constants
  const MY_USER_ID = userId;

  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playNextAudio = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;

    const ctx = ensureAudioContext();
    if (!ctx) {
      isPlayingRef.current = false;
      return;
    }

    const nextBuffer = audioQueueRef.current.shift();
    if (!nextBuffer) {
      isPlayingRef.current = false;
      return;
    }

    try {
      const audioBuffer = await ctx.decodeAudioData(nextBuffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        isPlayingRef.current = false;
        playNextAudio();
      };
      source.start();
    } catch (e) {
      console.error("Audio playback error", e);
      isPlayingRef.current = false;
      playNextAudio();
    }
  };

  const processNextInQueue = async () => {
    if (isProcessingRef.current || processingQueueRef.current.length === 0) return;
    isProcessingRef.current = true;

    const item = processingQueueRef.current.shift();
    if (!item) {
        isProcessingRef.current = false;
        return;
    }

    try {
        // 1. Translate
        const tRes = await fetch('/api/orbit/translate', {
            method: 'POST',
            body: JSON.stringify({
                text: item.text,
                targetLang: selectedLanguage.code
            })
        });
        const tData = await tRes.json();
        let translated = tData.translation || item.text;
        
        // Show translated text temporarily as live text if listening
        if (isListening) {
             setLiveText(translated); 
             // Clear after delay or let next segment replace
        }

        // 2. TTS
        if (isListening) {
             const ttsRes = await fetch('/api/orbit/tts', {
                method: 'POST',
                body: JSON.stringify({ text: translated })
             });
             const arrayBuffer = await ttsRes.arrayBuffer();
             if (arrayBuffer.byteLength > 0) {
                 audioQueueRef.current.push(arrayBuffer);
                 playNextAudio();
             }
        }
    } catch (e) {
        console.error("Pipeline error", e);
    } finally {
        isProcessingRef.current = false;
        processNextInQueue();
    }
  };

  // Subscribe to Room State for Lock status
  useEffect(() => {
    if (!roomUuid) return;
    
    // Subscribe to DB Transcripts for Translation
    // We listen to ALL transcripts, filter out our own, and if isListening is true, we translate them.
    const channel = supabase.channel(`room:${roomUuid}:transcripts_sidebar`)
    .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transcript_segments',
        filter: `meeting_id=eq.${roomUuid}`
    }, (payload: any) => {
        if (payload.new.speaker_id !== MY_USER_ID) {
            // Someone else spoke
            // Update transcript view? 
            setTranscript(payload.new.source_text); // Simple update

            if (isListening) {
                processingQueueRef.current.push({ text: payload.new.source_text });
                processNextInQueue();
            }
        }
    })
    .subscribe();

    const sub = orbitService.subscribeToRoomState(roomUuid, (state) => {
      const activeSpeaker = state.active_speaker_user_id;
      setIsLockedByOther(!!activeSpeaker && activeSpeaker !== userId);
    });

    return () => {
      sub.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [roomUuid, userId, isListening, selectedLanguage]); // Re-sub if language/listening changes? No, logic is in callback. But callback captures closure. 
  // Actually, Effect deps need careful handling. 
  // Better to use Ref for selectedLanguage and isListening in the callback
  
  const selectedLanguageRef = useRef(selectedLanguage);
  useEffect(() => { selectedLanguageRef.current = selectedLanguage; }, [selectedLanguage]);
  
  const isListeningRef = useRef(isListening);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

  // FIX: Re-implement subscription to use refs inside
  useEffect(() => {
      if (!roomUuid) return;
      const channel = supabase.channel(`room:${roomCode}:transcripts_v2`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transcript_segments', filter: `meeting_id=eq.${roomCode}` }, (payload: any) => {
             if (payload.new.speaker_id !== MY_USER_ID) {
                 setTranscript(payload.new.source_text);
                 if (isListeningRef.current) {
                     processingQueueRef.current.push({ text: payload.new.source_text });
                     processNextInQueue();
                 }
             }
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
  }, [roomCode, MY_USER_ID]);


  // Start WebSpeech for real-time subtitles
  const startWebSpeech = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLanguage.code === 'auto' ? 'en-US' : selectedLanguage.code;

    recognition.onresult = async (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }

      setLiveText(interim || final);

      if (final.trim() && roomUuid) {
        setTranscript(final);
        setLiveText('');
        
        const sentences = final.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0);
        for (const sentence of sentences) {
            orbitService.saveUtterance(roomUuid, userId, sentence, selectedLanguageRef.current.code).catch(e => console.warn(e));
        }
      }
    };

    recognition.onerror = (e: any) => {
      console.error('Speech recognition error:', e.error);
    };

    recognition.onend = () => {
      if (mode === 'speaking' && recognitionRef.current) {
        try { recognition.start(); } catch (e) {}
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [roomUuid, userId, mode, selectedLanguage]);

  // Stop WebSpeech
  const stopWebSpeech = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setLiveText('');
  }, []);

  // Start Speaking Mode
  const startSpeaking = useCallback(async () => {
    if (!roomUuid) {
      toast.error('Connecting to room...');
      return;
    }
    const acquired = await orbitService.acquireSpeakerLock(roomCode, userId);
    if (!acquired) {
      toast.error('Someone else is speaking');
      return;
    }
    startWebSpeech();
    setMode('speaking');
  }, [mode, roomCode, roomUuid, userId, startWebSpeech]);

  // Stop Speaking Mode
  const stopSpeaking = useCallback(async () => {
    stopWebSpeech();
    await orbitService.releaseSpeakerLock(roomCode, userId);
    setMode('idle');
  }, [roomCode, userId, stopWebSpeech]);

  // Status helpers
  const getStatusClass = () => {
    if (!roomUuid) return styles.statusConnecting;
    if (mode === 'speaking') return styles.statusSpeaking;
    if (isLockedByOther) return styles.statusLocked;
    return styles.statusReady;
  };

  const getStatusText = () => {
    if (!roomUuid) return 'Connecting...';
    if (mode === 'speaking') return 'Speaking...';
    if (isLockedByOther) return 'Locked';
    return 'Ready';
  };

  const speakDisabled = isLockedByOther || !roomUuid;

  // Language Dropdown reference
  const langMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
      function handleClickOutside(event: any) {
          if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
              setIsLangOpen(false);
          }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, [langMenuRef]);

  // Helper format time
  const formatTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col h-full bg-[#111315] text-white border-l border-white/5 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#1a1c1f]/50 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="relative">
             <div className="absolute inset-0 bg-blue-500/20 blur-md rounded-full"></div>
             <OrbitIcon size={22} />
          </div>
          <span className="font-semibold text-[15px] tracking-wide text-slate-100">AI Translator</span>
        </div>
        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/20 border border-white/5 ${
            !roomUuid ? 'text-amber-400' :
            mode === 'speaking' ? 'text-rose-400' :
            isLockedByOther ? 'text-orange-400' :
            'text-emerald-400'
        }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
                !roomUuid ? 'bg-amber-400 animate-pulse' :
                mode === 'speaking' ? 'bg-rose-400 animate-ping' :
                isLockedByOther ? 'bg-orange-400' :
                'bg-emerald-400'
            }`} />
            <span className="text-[11px] font-medium uppercase tracking-wider">
                {!roomUuid ? 'Connecting' :
                 mode === 'speaking' ? 'Live' :
                 isLockedByOther ? 'Locked' :
                 'Ready'}
            </span>
        </div>
      </div>

      {/* Global Subtitle Overlay */}
      {typeof document !== 'undefined' && (
        <OrbitSubtitleOverlay 
          text={liveText || (mode === 'speaking' ? transcript : '')} 
          isVisible={mode === 'speaking' && !!(liveText || transcript)} 
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
          
          {/* Controls Card */}
          <div className="bg-[#1c1e21] rounded-2xl p-1 border border-white/5 shadow-xl shadow-black/20">
              {/* Speak Button */}
              <button
                onClick={mode === 'speaking' ? stopSpeaking : startSpeaking}
                disabled={speakDisabled}
                className={`w-full group relative overflow-hidden rounded-xl p-4 transition-all duration-300 ${
                    mode === 'speaking' 
                    ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-900/30' 
                    : speakDisabled 
                        ? 'bg-slate-800/50 cursor-not-allowed opacity-50'
                        : 'bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/5'
                }`}
              >
                <div className="relative z-10 flex items-center justify-center gap-3">
                    {mode === 'speaking' ? (
                        <>
                            <div className="flex items-center gap-1 h-4">
                                <div className="w-1 h-full bg-white rounded-full animate-[music-bar_0.8s_ease-in-out_infinite]" />
                                <div className="w-1 h-3/4 bg-white rounded-full animate-[music-bar_1.1s_ease-in-out_infinite]" />
                                <div className="w-1 h-2/3 bg-white rounded-full animate-[music-bar_0.9s_ease-in-out_infinite]" />
                            </div>
                            <span className="font-bold text-white text-[15px]">Stop Speaking</span>
                        </>
                    ) : (
                        <>
                            <div className={`p-1.5 rounded-full ${speakDisabled ? 'bg-slate-700' : 'bg-gradient-to-br from-blue-400 to-indigo-500'} group-hover:scale-110 transition-transform`}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                    <line x1="12" y1="19" x2="12" y2="23"/>
                                    <line x1="8" y1="23" x2="16" y2="23"/>
                                </svg>
                            </div>
                            <span className={`font-semibold text-[15px] ${speakDisabled ? 'text-slate-500' : 'text-slate-200'}`}>Speak Now</span>
                        </>
                    )}
                </div>
              </button>

              {/* Settings Group */}
              <div className="mt-1 grid grid-cols-[1fr,1px,auto] gap-1 bg-black/20 rounded-xl border border-white/5 p-1">
                    <button
                        onClick={() => setIsListening(!isListening)}
                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all ${
                            isListening 
                            ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30' 
                            : 'bg-transparent hover:bg-white/5 text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <span className="text-[13px] font-medium">Auto-Translate</span>
                        <div className={`w-2 h-2 rounded-full border ${isListening ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-transparent border-slate-600'}`} />
                    </button>
                    
                    <div className="bg-white/10 my-1 rounded-full" />

                    <div className="relative">
                        <button
                            onClick={() => setIsLangOpen(!isLangOpen)}
                            className="h-full flex items-center gap-2 px-3 pl-3.5 rounded-lg hover:bg-white/5 min-w-[90px] justify-between group transition-colors"
                        >
                            <span className="text-lg leading-none filter drop-shadow-sm group-hover:scale-110 transition-transform">{selectedLanguage.flag}</span>
                            <span className="text-[13px] font-medium text-slate-300">{selectedLanguage.code.toUpperCase()}</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-slate-500 transition-transform duration-200 ${isLangOpen ? '-rotate-180' : ''}`}>
                                <path d="M6 9l6 6 6-6"/>
                            </svg>
                        </button>

                         {/* Dropdown Portal/Absolute */}
                        {isLangOpen && (
                            <div ref={langMenuRef} className="absolute right-0 top-full mt-2 w-48 z-50 bg-[#1f2125] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                <div className="max-h-[240px] overflow-y-auto py-1">
                                    {LANGUAGES.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => {
                                                setSelectedLanguage(lang);
                                                setIsLangOpen(false);
                                                if (mode === 'speaking' && recognitionRef.current) {
                                                    stopWebSpeech();
                                                    setTimeout(startWebSpeech, 100);
                                                }
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/5 transition-colors ${
                                                selectedLanguage.code === lang.code ? 'bg-indigo-500/10' : ''
                                            }`}
                                        >
                                            <span className="text-xl">{lang.flag}</span>
                                            <div className="flex flex-col">
                                                <span className={`text-[13px] font-medium ${selectedLanguage.code === lang.code ? 'text-indigo-400' : 'text-slate-300'}`}>{lang.name}</span>
                                            </div>
                                            {selectedLanguage.code === lang.code && <div className="ml-auto w-1.5 h-1.5 bg-indigo-400 rounded-full" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
              </div>
          </div>

          {/* Activity Logs */}
          <div className="flex-1 flex flex-col min-h-0">
             <div className="flex items-center justify-between mb-2 px-1">
                 <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Live Transcript</h3>
                 <span className="text-[10px] text-slate-600">{formatTime()}</span>
             </div>
             
             <div className="flex-1 bg-[#0f1012] rounded-xl border border-white/5 p-3 overflow-y-auto shadow-inner">
                {transcript ? (
                    <div className={`flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                {mode === 'speaking' ? 'ME' : 'AI'}
                             </div>
                             <span className="text-[11px] font-semibold text-slate-400">{mode === 'speaking' ? 'You' : 'Speaker'}</span>
                        </div>
                        <div className="ml-8 p-3 rounded-2xl rounded-tl-none bg-[#1a1c1f] border border-white/5 text-[14px] leading-relaxed text-slate-200 shadow-sm relative">
                             {transcript}
                             {isListening && (
                                <div className="mt-2 pt-2 border-t border-white/5">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <div className="w-1 h-3 bg-emerald-500/50 rounded-full"></div>
                                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Translated</span>
                                    </div>
                                    <p className="text-emerald-100/90 font-medium">{transcript}</p>
                                </div>
                             )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2 opacity-60">
                        <div className="p-3 bg-white/5 rounded-full">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                        </div>
                        <p className="text-sm font-medium">No activity yet</p>
                    </div>
                )}
             </div>
          </div>

      </div>
    
      {/* Footer / Status Bar - optional */}
      <div className="px-5 py-2 border-t border-white/5 bg-[#1a1c1f]/30 text-[10px] text-slate-600 flex justify-between items-center">
          <span>Ollamma • Gemini • WebSpeech</span>
          <div className="flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20"></div>
             <span>v2.1.0</span>
          </div>
      </div>
    </div>
  );
}
// Export the icon for use in control bar
export { OrbitIcon };
