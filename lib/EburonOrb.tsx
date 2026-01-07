'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from '@/styles/Eburon.module.css';
import { Settings as SettingsIcon, Mic, Volume2, X } from 'lucide-react';
import { useAudioPlayback } from '@livekit/components-react';

interface EburonOrbProps {
  isTranscriptionActive?: boolean;
  isTranslationActive?: boolean;
  onToggleTranscription?: () => void;
  onToggleTranslation?: () => void;
  onOpenSettings?: () => void;
}

export function EburonOrb({
  isTranscriptionActive,
  isTranslationActive,
  onToggleTranscription,
  onToggleTranslation,
  onOpenSettings,
}: EburonOrbProps) {
  const orbRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState({ x: 20, y: 100 }); // from bottom-right as in HTML
  const dragStart = useRef({ x: 0, y: 0 });
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState('Waiting for audio...');

  // Visualizer logic
  useEffect(() => {
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let animationId: number;

    const startViz = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        const src = audioCtx.createMediaStreamSource(stream);
        src.connect(analyser);
        
        const dataArr = new Uint8Array(analyser.frequencyBinCount);
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        const draw = () => {
          animationId = requestAnimationFrame(draw);
          analyser!.getByteFrequencyData(dataArr);
          
          ctx.clearRect(0, 0, 72, 72);
          const volume = dataArr.reduce((a, b) => a + b) / dataArr.length;
          
          const color = isTranslationActive ? '#bd00ff' : '#43e97b';
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(36, 36, 22 + volume / 10, 0, Math.PI * 2);
          ctx.stroke();
        };
        draw();
      } catch (err) {
        console.error('Visualizer error:', err);
      }
    };

    startViz();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (audioCtx) audioCtx.close();
    };
  }, [isTranslationActive]);

  // Dragging logic
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(`.${styles.gearBtn}`)) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    setPos({ x: newX, y: newY });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <>
      <div 
        ref={orbRef}
        className={styles.orbitSystem}
        style={{ 
          left: isDragging ? undefined : undefined, 
          right: pos.x, 
          bottom: pos.y,
          position: 'fixed'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className={styles.orbitRing} />
        <div className={styles.gearBtn} onClick={(e) => { e.stopPropagation(); onOpenSettings?.(); }}>
          <SettingsIcon className="w-4 h-4 text-white" />
        </div>
        <div className={`${styles.ebPlanet} ${isTranscriptionActive || isTranslationActive ? styles.ebPlanetActive : ''} ${isTranslationActive ? styles.ebPlanetTranslate : ''}`}>
          <canvas ref={canvasRef} width={72} height={72} style={{ position: 'absolute', inset: 0 }} />
          {isTranslationActive ? (
             <Volume2 className="w-7 h-7 text-white z-10" />
          ) : (
            <Mic className="w-7 h-7 text-white z-10" />
          )}
        </div>
      </div>

      {/* Simplified Subtitle Display managed by Orb */}
      <div className="fixed bottom-[60px] left-1/2 -translate-x-1/2 w-[95%] max-w-[800px] z-[2500] flex justify-center pointer-events-none">
        <div className={`
          bg-black/85 backdrop-blur-[20px] px-[30px] py-[16px] rounded-[30px] border border-white/15 text-center
          transition-all duration-300 shadow-2xl
          ${isTranscriptionActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-5 scale-95'}
        `}>
          <span className="text-[9px] font-extrabold text-[#D4AF37] block mb-[6px] tracking-[1.5px] uppercase">
            {isTranslationActive ? 'Gemini Translator' : 'Orbit Model Active'}
          </span>
          <span className="text-xl font-medium text-white shadow-sm">
            {transcriptionText}
          </span>
        </div>
      </div>
    </>
  );
}
