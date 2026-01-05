
import React from 'react';
import { AppMode, Language, LANGUAGES, RoomState, AudioSource, EmotionType, EMOTION_COLORS } from '../types';
import { ChevronDown, Mic, Volume2, Hand, X, Lock, Loader2, Play, Share2, LogOut, ChevronUp } from 'lucide-react';

interface TranslatorDockProps {
  mode: AppMode;
  roomState: RoomState;
  selectedLanguage: Language;
  myUserId: string;
  onSpeakToggle: () => void;
  onListenToggle: () => void;
  onLanguageChange: (lang: Language) => void;
  onRaiseHand: () => void;
  audioData?: Uint8Array;
  audioSource: AudioSource;
  onAudioSourceToggle: () => void;
  liveStreamText?: string;
  translatedStreamText?: string;
  isTtsLoading?: boolean;
  emotion?: EmotionType;
  onJoin?: (meetingId: string) => void;
  meetingId?: string | null;
  onInvite?: () => void;
  isSignedIn: boolean;
  onAuthToggle: (meetingId?: string) => void;
  isMinimized: boolean;
  onMinimizeToggle: () => void;
}

// emotionColors moved to types.ts as EMOTION_COLORS

const Bar: React.FC<{ val: number; colorClass: string }> = ({ val, colorClass }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const height = Math.max(2, (val / 255) * 14);
  const opacity = 0.3 + (val / 255) * 0.7;

  React.useLayoutEffect(() => {
    if (ref.current) {
      ref.current.style.height = `${height}px`;
      ref.current.style.opacity = `${opacity}`;
    }
  }, [height, opacity]);

  return <div ref={ref} className={`w-[1.8px] ${colorClass} rounded-full transition-all duration-100 ease-out`} />;
};

const AudioVisualizer: React.FC<{ data: Uint8Array; colorClass?: string }> = ({ data, colorClass = 'bg-white' }) => {
  if (!data || data.length === 0) return null;
  const barsArr = Array.from(data.slice(3, 11));
  const hasSignal = barsArr.some((v: number) => v > 4);
  if (!hasSignal) return null;

  return (
    <div className="flex items-center gap-[1.5px] h-3 ml-2.5">
      {barsArr.map((val, i) => (
        <Bar key={i} val={val} colorClass={colorClass} />
      ))}
    </div>
  );
};

const TranslatorDock: React.FC<TranslatorDockProps> = ({
  mode,
  roomState,
  selectedLanguage,
  myUserId,
  onSpeakToggle,
  onListenToggle,
  onLanguageChange,
  onRaiseHand,
  audioData,
  audioSource,
  onAudioSourceToggle,
  liveStreamText,
  translatedStreamText,
  isTtsLoading,
  emotion = 'neutral',
  onJoin,
  meetingId,
  onInvite,
  isSignedIn,
  onAuthToggle,
  isMinimized,
  onMinimizeToggle
}) => {
  const [meetingIdInput, setMeetingIdInput] = React.useState(meetingId || '');
  
  // Update local input if external meetingId changes (and we aren't typing)
  React.useEffect(() => {
    if (meetingId) setMeetingIdInput(meetingId);
  }, [meetingId]);

  const handleStart = () => {
    // If signed in, treat as switch/join (reload). 
    // If signed out, treat as start with ID (auth + set ID).
    if (isSignedIn && onJoin && meetingIdInput.trim()) {
      onJoin(meetingIdInput.trim());
    } else if (!isSignedIn && meetingIdInput.trim()) {
       onAuthToggle(meetingIdInput.trim());
    } else if (!isSignedIn) {
       onAuthToggle(); // standard random start
    }
  };
  const isSomeoneElseSpeaking = roomState.activeSpeaker && roomState.activeSpeaker.userId !== myUserId;
  const isMeSpeaking = mode === 'speaking';
  const isMeListening = mode === 'listening';
  
  const [showLangs, setShowLangs] = React.useState(false);
  const myQueuePosition = roomState.raiseHandQueue.findIndex(q => q.userId === myUserId);
  const isQueued = myQueuePosition !== -1;

  const displayText = isMeListening ? translatedStreamText : liveStreamText;
  const isTranslation = isMeListening && !!translatedStreamText;

  const handleLangClick = () => {
    if (!isMeListening) {
      setShowLangs(!showLangs);
    }
  };

  return (
    <>
      {/* Minimize/Restore Toggle Tab - Centered at the very top */}
      <div className={`fixed top-0 left-1/2 -translate-x-1/2 z-[60] transition-all duration-300 ${isMinimized ? 'translate-y-0' : 'translate-y-[60px]'}`}>
        <button
          onClick={onMinimizeToggle}
          title={isMinimized ? "Show Toolbar" : "Hide Toolbar"}
          className="bg-[#1a2333] hover:bg-[#25324a] text-slate-400 hover:text-white rounded-b-lg px-3 py-1 border-x border-b border-white/5 shadow-lg transition-colors flex items-center justify-center"
        >
          {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      <header 
        className={`fixed top-0 left-0 right-0 h-[60px] bg-[#1a2333]/95 backdrop-blur-2xl border-b border-white/5 z-50 flex items-center justify-center px-4 transition-transform duration-300 ${isMinimized ? '-translate-y-full' : 'translate-y-0'}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-stretch h-full w-full max-w-5xl">
        
        {/* Speak Button */}
        <div className="relative flex-1 flex items-stretch border-r border-white/5">
          <button
            onClick={onSpeakToggle}
            disabled={(isSomeoneElseSpeaking && !isMeSpeaking) || isMeListening}
            className={`flex-1 flex items-center justify-center gap-3 px-4 transition-all disabled:opacity-30 ${
              isMeSpeaking ? 'bg-red-500/90 text-white animate-live-pulse' : 'hover:bg-white/5 text-slate-300'
            }`}
          >
            {isMeSpeaking ? <X className="w-4 h-4" /> : (isSomeoneElseSpeaking || isMeListening ? <Lock className="w-4 h-4 opacity-40" /> : <Mic className="w-4 h-4" />)}
            <span className="font-bold text-[16px] tracking-tight">Speak</span>
            {isMeSpeaking && audioData && <AudioVisualizer data={audioData} colorClass="bg-white" />}
          </button>
        </div>

        {/* Listen Button */}
        <button
          onClick={onListenToggle}
          disabled={isMeSpeaking}
          className={`flex-1 flex items-center justify-center gap-3 px-4 transition-all border-r border-white/5 disabled:opacity-20 ${
            isMeListening ? 'bg-blue-600/95 text-white ring-1 ring-blue-400/40 shadow-inner' : 'hover:bg-white/5 text-slate-300'
          }`}
        >
          {isTtsLoading ? <Loader2 className="w-4 h-4 animate-spin text-blue-200" /> : <Volume2 className="w-4 h-4" />}
          <span className="font-bold text-[16px] tracking-tight">{isMeListening ? 'Live Aloud' : 'Listen'}</span>
          {isMeListening && audioData && <AudioVisualizer data={audioData} colorClass="bg-blue-200" />}
        </button>

        {/* Language Center */}
        <div className="relative flex-1 flex items-stretch border-r border-white/5">
          <button
            onClick={handleLangClick}
            disabled={isMeListening}
            className={`flex-1 flex items-center gap-3 px-4 transition-all ${
              isMeListening ? 'cursor-not-allowed opacity-50' : 'hover:bg-white/5'
            }`}
          >
            <span className="text-2xl drop-shadow-md">{selectedLanguage.flag}</span>
            <div className="flex flex-col items-start min-w-0">
              <span className="font-black text-slate-100 text-[14px] uppercase truncate w-full text-left leading-none">{selectedLanguage.code.split('-')[1] || selectedLanguage.code}</span>
              <span className="text-slate-500 text-[9px] font-black uppercase tracking-wider truncate w-full text-left">{selectedLanguage.name}</span>
            </div>
            {!isMeListening && <ChevronDown className="w-3 h-3 text-slate-600" />}
          </button>

          {showLangs && !isMeListening && (
            <div className="absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2 bg-[#0f172a]/98 border border-white/10 rounded-2xl shadow-2xl p-2 w-[280px] max-h-[400px] overflow-y-auto z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { onLanguageChange(lang); setShowLangs(false); }}
                  className={`flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-left w-full transition-all ${
                    selectedLanguage.code === lang.code ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-slate-400'
                  }`}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className="text-[13px] font-bold">{lang.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Raise Hand Queue */}
        <button
          onClick={onRaiseHand}
          disabled={isMeSpeaking}
          className={`flex-1 flex items-center justify-center gap-3 px-4 transition-all disabled:opacity-20 ${
            isQueued ? 'bg-amber-600/90 text-white' : 'hover:bg-white/5 text-slate-300'
          }`}
        >
          <Hand className={`w-4 h-4 ${isQueued ? 'animate-bounce' : ''}`} />
          <span className="font-bold text-[16px] tracking-tight">{isQueued ? 'Queued' : 'Queue'}</span>
        </button>

        {/* Meeting ID Input & Join */}
        <div className="flex items-center border-l border-white/5 h-full animate-in fade-in slide-in-from-right-4 duration-300">
          <input 
            type="text" 
            value={meetingIdInput}
            onChange={(e) => setMeetingIdInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            placeholder={isSignedIn ? "Switch Room ID" : "Join Room ID"}
            className="w-32 bg-transparent text-slate-200 text-sm font-semibold px-4 focus:outline-none placeholder:text-slate-600 h-full text-center"
          />
          {meetingIdInput !== meetingId && (
            <button 
              onClick={handleStart} 
              title={isSignedIn ? "Switch Room" : "Join Room"}
              className="h-full px-3 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              <Play className="w-3 h-3 fill-current" />
            </button>
          )}
        </div>

        {/* Start/Stop Toggle Button */}
        <button
          onClick={() => isSignedIn ? onAuthToggle() : handleStart()}
          className={`flex-1 flex items-center justify-center gap-3 px-4 transition-all border-l border-white/5 ${
            isSignedIn 
              ? 'hover:bg-red-500/10 text-red-400' 
              : 'hover:bg-emerald-500/10 text-emerald-400'
          }`}
        >
          {isSignedIn ? <LogOut className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          <span className="font-bold text-[16px] tracking-tight">{isSignedIn ? 'Stop' : (meetingIdInput ? 'Join' : 'Start')}</span>
        </button>

        {/* Share Button - Only Visible when Signed In */}
        {isSignedIn && (
          <button
            onClick={onInvite}
            title={meetingId ? `Share Meeting: ${meetingId}` : 'Share Meeting'}
            className="flex-1 flex items-center justify-center gap-3 px-4 transition-all hover:bg-emerald-500/10 text-emerald-400 border-l border-white/5"
          >
            <Share2 className="w-4 h-4" />
            <span className="font-bold text-[16px] tracking-tight">Share</span>
          </button>
        )}
      </div>
      </header>
    </>
  );
};

export default TranslatorDock;
