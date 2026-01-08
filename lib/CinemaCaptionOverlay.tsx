'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useGeminiLive } from './useGeminiLive';
import { useRoomContext, useLocalParticipant } from '@livekit/components-react';
import { Track } from 'livekit-client';

const overlayStyles = {
  captionBar: {
    position: 'fixed' as 'fixed',
    bottom: 80, // Position above the control bar
    left: '20px',
    right: '20px',
    width: 'auto',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '0 20px',
    zIndex: 999,
  },
  transcriptText: {
    fontSize: '14px',
    color: '#66ff00',
    fontWeight: 600,
    textAlign: 'left' as 'left',
    whiteSpace: 'nowrap' as 'nowrap',
    overflow: 'visible',
    width: '100%',
    textShadow: '0px 2px 4px rgba(0,0,0,0.9)',
    animation: 'slideIn 0.3s ease-out',
  },
};

interface CinemaCaptionOverlayProps {
    onTranscriptSegment: (segment: { text: string; language: string; isFinal: boolean }) => void;
    defaultDeviceId?: string;
}

export function CinemaCaptionOverlay({ onTranscriptSegment, defaultDeviceId }: CinemaCaptionOverlayProps) {
    const [displayText, setDisplayText] = useState('');
    const [isFading, setIsFading] = useState(false);
    const captionRef = useRef<HTMLDivElement>(null);
    const { localParticipant } = useLocalParticipant();
    const lastMicStateRef = useRef<boolean | null>(null);
    
    const {
        isRecording,
        transcription,
        toggleRecording,
        status
    } = useGeminiLive();

    // Auto-start/stop transcription based on mic state
    useEffect(() => {
        if (!localParticipant) return;

        const micPub = localParticipant.getTrackPublication(Track.Source.Microphone);
        const isMicEnabled = !micPub?.isMuted && micPub?.track !== undefined;

        // Only toggle if mic state actually changed
        if (lastMicStateRef.current !== isMicEnabled) {
            lastMicStateRef.current = isMicEnabled;
            
            if (isMicEnabled && !isRecording) {
                toggleRecording();
            } else if (!isMicEnabled && isRecording) {
                toggleRecording();
            }
        }
    }, [localParticipant, isRecording, toggleRecording]);

    // Save transcription segments
    useEffect(() => {
        if (transcription) {
            onTranscriptSegment({ text: transcription, language: 'en', isFinal: true });
        }
    }, [transcription, onTranscriptSegment]);

    // Update display text
    useEffect(() => {
        const fullText = transcription || '';
        setDisplayText(fullText);
    }, [transcription]);

    // Auto-clear logic when text overflows
    useEffect(() => {
        if (captionRef.current && displayText) {
            const element = captionRef.current;
            const isOverflowing = element.scrollWidth > element.clientWidth;
            
            if (isOverflowing) {
                setIsFading(true);
                setTimeout(() => {
                    setDisplayText('');
                    setIsFading(false);
                }, 300);
            }
        }
    }, [displayText]);

    return (
        <div style={overlayStyles.captionBar}>
            <div 
                ref={captionRef}
                style={{
                    ...overlayStyles.transcriptText,
                    opacity: isFading ? 0 : 1,
                    transition: 'opacity 0.3s ease-out'
                }}
            >
                {displayText || (isRecording && <span style={{color: '#66ff00', fontSize: '14px', fontWeight: 600}}>🎤 Listening...</span>)}
            </div>
        </div>
    );
}
