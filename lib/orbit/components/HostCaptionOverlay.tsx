'use client';

import React, { useEffect, useRef } from 'react';
import styles from '@/styles/HostCaptionOverlay.module.css';
import { HostCaptionRenderer, WordToken } from '../utils/HostCaptionRenderer';

interface HostCaptionOverlayProps {
  words: Array<{ word: string; start: number; end: number; confidence: number }>;
  isFinal: boolean;
  isListening: boolean;
  analyser?: AnalyserNode | null;
  simulation?: boolean;
  translationText?: string;
  isTranslationFinal?: boolean;
}

export function HostCaptionOverlay({ 
  words, 
  isFinal, 
  isListening, 
  analyser,
  simulation = false,
  translationText
}: HostCaptionOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<HostCaptionRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // If showing translation, we might want to pause/clear the standard renderer
    // But for now, we'll just initialize it as usual.
    const renderer = new HostCaptionRenderer(containerRef.current);
    renderer.init();
    renderer.setBoxClass(styles.captionText);
    rendererRef.current = renderer;

    if (simulation) {
      renderer.setSimulation(true);
    }

    const audioContext = analyser?.context as AudioContext | undefined;
    renderer.start(audioContext);

    return () => {
      renderer.stop();
    };
  }, [analyser, simulation]); // Re-init if these change

  useEffect(() => {
    if (rendererRef.current) {
        // If translation is showing, maybe clear the renderer?
        if (translationText) {
             rendererRef.current.clear();
             return;
        }
      rendererRef.current.update(words as WordToken[], isFinal);
    }
  }, [words, isFinal, translationText]);

  useEffect(() => {
    if (!isListening && rendererRef.current && !translationText) {
      rendererRef.current.clear();
    }
  }, [isListening, translationText]);

  return (
    <div className={styles.overlayContainer} ref={containerRef}>
      <div className={styles.captionBox} style={translationText ? { border: '1px solid #32cd32', boxShadow: '0 0 15px rgba(50, 205, 50, 0.3)' } : {}}>
        {translationText ? (
            <div style={{ color: '#32cd32', fontWeight: 600, textShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
                {translationText}
            </div>
        ) : (
            null /* Renderer injects here if standard captions */
        )}
      </div>
    </div>
  );
}
