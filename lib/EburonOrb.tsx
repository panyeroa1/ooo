'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from '@/styles/Eburon.module.css';
import { Settings as SettingsIcon, Mic, Volume2 } from 'lucide-react';
import { startDeepgramTranscription, DeepgramTranscriptionSession } from './orbit/services/deepgramTranscriptionService';
import { translateText } from './orbit/services/geminiService';
import { speakText } from './orbit/services/cartesiaService';

interface EburonOrbProps {
  meetingId: string;
  userId: string;
  isTranscriptionActive?: boolean;
  isTranslationActive?: boolean;
  onToggleTranscription?: () => void;
  onToggleTranslation?: () => void;
  onOpenSettings?: () => void;
  targetLanguage?: string;
}

export function EburonOrb({
  meetingId,
  userId,
  isTranscriptionActive,
  isTranslationActive,
  onToggleTranscription,
  onToggleTranslation,
  onOpenSettings,
  targetLanguage = 'Spanish',
}: EburonOrbProps) {
  const orbRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState({ x: 20, y: 100 }); 
  const dragStart = useRef({ x: 0, y: 0 });
  const [transcriptionText, setTranscriptionText] = useState('Waiting for audio...');

  const sessionRef = useRef<DeepgramTranscriptionSession | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Visualizer and Transcription Logic
  useEffect(() => {
    let animationId: number;

    const startProcessing = async () => {
      try {
        if (!isTranscriptionActive && !isTranslationActive) {
          // If neither is active, we can still show a visualizer if desired,
          // but for simplicity let's only start if something is active or just keep it simple.
          // Actually, let's always start the visualizer if the component is mounted.
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        
        source.connect(analyser);
        source.connect(processor);
        processor.connect(audioContext.destination);
        processorRef.current = processor;

        if (isTranscriptionActive || isTranslationActive) {
          const session = await startDeepgramTranscription(
            meetingId,
            userId,
            async (text, isFinal) => {
              if (isFinal) {
                setTranscriptionText(text);
                
                if (isTranslationActive) {
                  try {
                    const translated = await translateText(text, targetLanguage);
                    setTranscriptionText(translated);
                    await speakText(translated);
                  } catch (err) {
                    console.error('Translation/TTS error:', err);
                  }
                }
              } else {
                setTranscriptionText(text);
              }
            },
            () => {
              console.log('[Deepgram] Session ended');
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
              sessionRef.current.sendAudio(pcm16.buffer);
            }
          };
        }

        const dataArr = new Uint8Array(analyser.frequencyBinCount);
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        const draw = () => {
          animationId = requestAnimationFrame(draw);
          analyser.getByteFrequencyData(dataArr);
          
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
        console.error('Core processing error:', err);
      }
    };

    startProcessing();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      
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
    };
  }, [isTranscriptionActive, isTranslationActive, meetingId, userId, targetLanguage]);

  // Sync position to CSS variables via ref to avoid React inline-style lint
  useEffect(() => {
    if (orbRef.current) {
      orbRef.current.style.setProperty('--orb-right', `${pos.x}px`);
      orbRef.current.style.setProperty('--orb-bottom', `${pos.y}px`);
    }
  }, [pos]);

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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className={styles.orbitRing} />
        <div className={styles.gearBtn} onClick={(e) => { e.stopPropagation(); onOpenSettings?.(); }}>
          <SettingsIcon className="w-4 h-4 text-white" />
        </div>
        <div className={`${styles.ebPlanet} ${isTranscriptionActive || isTranslationActive ? styles.ebPlanetActive : ''} ${isTranslationActive ? styles.ebPlanetTranslate : ''}`}>
          <canvas ref={canvasRef} width={72} height={72} className={styles.planetCanvas} />
          {isTranslationActive ? (
             <Volume2 className="w-7 h-7 text-white z-10" />
          ) : (
            <Mic className="w-7 h-7 text-white z-10" />
          )}
        </div>
      </div>

      {/* Subtitle Display */}
      <div className={styles.subtitleContainer}>
        <div className={`
          ${styles.subtitleContent}
          ${isTranscriptionActive ? styles.subtitleActive : styles.subtitleInactive}
        `}>
          <span className={styles.subtitleMeta}>
            {isTranslationActive ? 'Gemini Translator' : 'Orbit Model Active'}
          </span>
          <span className={styles.subtitleText}>
            {transcriptionText}
          </span>
        </div>
      </div>
    </>
  );
}
