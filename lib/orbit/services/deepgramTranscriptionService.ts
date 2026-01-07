
import { supabase } from './supabaseClient';

const DEEPGRAM_API_KEY = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY || process.env.DEEPGRAM_API_KEY;

export interface DeepgramTranscriptionSession {
  sendAudio: (data: ArrayBuffer | Uint8Array) => void;
  stop: () => void;
}

export async function startDeepgramTranscription(
  meetingId: string,
  speakerId: string,
  onTranscript: (text: string, isFinal: boolean) => void,
  onEnd: () => void,
  language: string = 'multi'
): Promise<DeepgramTranscriptionSession> {
  const model = 'nova-2';
  const queryParams = new URLSearchParams({
    model,
    smart_format: 'true',
    language: language === 'auto' ? 'multi' : language,
    endpointing: '300', // Faster endpointing for real-time shipping
    interim_results: 'true',
    encoding: 'linear16',
    sample_rate: '16000',
  });

  const wsUrl = `wss://api.deepgram.com/v1/listen?${queryParams.toString()}`;
  
  return new Promise((resolve, reject) => {
    if (!DEEPGRAM_API_KEY) {
      reject(new Error('Deepgram API Key is not configured'));
      return;
    }

    const socket = new WebSocket(wsUrl, ['token', DEEPGRAM_API_KEY]);

    socket.onopen = () => {
      console.log('[Deepgram] WebSocket connection opened');
      resolve({
        sendAudio: (data: ArrayBuffer | Uint8Array) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(data);
          }
        },
        stop: () => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.close();
          }
        }
      });
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        const isFinal = data.is_final;

        if (transcript && transcript.trim()) {
          onTranscript(transcript, isFinal);

          // Ship "final" results to Supabase immediately
          if (isFinal) {
            const { error } = await supabase.from('transcriptions').insert({
              meeting_id: meetingId,
              speaker_id: speakerId,
              transcribe_text_segment: transcript,
              full_transcription: transcript, // Or concatenate if needed, but per request we ship segmented text
              created_at: new Date().toISOString()
            });

            if (error) {
              console.error('[Supabase] Error saving transcription segment:', error);
            }
          }
        }
      } catch (err) {
        console.error('[Deepgram] Error parsing message or saving to Supabase:', err);
      }
    };

    socket.onclose = () => {
      console.log('[Deepgram] WebSocket connection closed');
      onEnd();
    };

    socket.onerror = (error) => {
      console.error('[Deepgram] WebSocket error:', error);
      reject(error);
    };
  });
}
