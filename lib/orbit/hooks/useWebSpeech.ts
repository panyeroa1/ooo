'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

interface UseWebSpeechOptions {
    language?: string;
    continuous?: boolean;
    interimResults?: boolean;
}

interface UseWebSpeechReturn {
    isListening: boolean;
    transcript: string;
    isFinal: boolean;
    start: () => void;
    stop: () => void;
    setLanguage: (lang: string) => void;
    language: string;
    error: string | null;
    analyser: AnalyserNode | null; // Web Speech doesn't provide an analyser easily, but we can mock it or use an empty one
    words: any[];
}

export function useWebSpeech(options: UseWebSpeechOptions = {}): UseWebSpeechReturn {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isFinal, setIsFinal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentLanguage, setCurrentLanguage] = useState(options.language || 'en-US');

    const recognitionRef = useRef<any>(null);

    const stop = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, []);

    const start = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setError('Web Speech API not supported in this browser');
            return;
        }

        if (!recognitionRef.current) {
            const recognition = new SpeechRecognition();
            recognition.continuous = options.continuous !== undefined ? options.continuous : true;
            recognition.interimResults = options.interimResults !== undefined ? options.interimResults : true;
            recognition.lang = currentLanguage;

            recognition.onstart = () => {
                setIsListening(true);
                setError(null);
            };

            recognition.onerror = (event: any) => {
                console.error('WebSpeech Error:', event.error);
                if (event.error === 'no-speech') return; // Ignore brief silence
                setError(event.error);
                setIsListening(false);
            };

            recognition.onend = () => {
                // If it was supposed to be continuous, we might want to restart?
                // But let's keep it simple for now.
                setIsListening(false);
            };

            recognition.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                const fullTranscript = finalTranscript || interimTranscript;
                if (fullTranscript) {
                    setTranscript(fullTranscript);
                    setIsFinal(!!finalTranscript);
                }
            };

            recognitionRef.current = recognition;
        }

        try {
            recognitionRef.current.lang = currentLanguage;
            recognitionRef.current.start();
        } catch (e) {
            console.warn('WebSpeech start failed (already started?)', e);
        }
    }, [currentLanguage, options.continuous, options.interimResults]);

    const setLanguage = useCallback((lang: string) => {
        setCurrentLanguage(lang);
        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
            // It will restart on onend or we can manually restart
            setTimeout(() => start(), 100);
        }
    }, [isListening, start]);

    return useMemo(() => ({
        isListening,
        transcript,
        isFinal,
        start,
        stop,
        setLanguage,
        language: currentLanguage,
        error,
        analyser: null, // To be filled if we want visualizer support
        words: []
    }), [isListening, transcript, isFinal, start, stop, setLanguage, currentLanguage, error]);
}
