
/**
 * Deepgram Real-Time STT Service
 */

const DEEPGRAM_API_KEY = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;

export interface DeepgramSession {
  sendAudio: (data: ArrayBuffer | Uint8Array) => void;
  stop: () => void;
}

export async function startDeepgramSession(
  onTranscript: (text: string, isFinal: boolean) => void,
  onEnd: () => void,
  language: string = 'multi'
): Promise<DeepgramSession> {
  const model = 'nova-2';
  const smartFormat = 'true';
  const endpointing = '10';
  const interimResults = 'true';
  const encoding = 'linear16';
  const sampleRate = '16000';

  const queryParams = new URLSearchParams({
    model,
    smart_format: smartFormat,
    language: language === 'auto' ? 'multi' : language,
    endpointing,
    interim_results: interimResults,
    encoding,
    sample_rate: sampleRate,
  });

  const wsUrl = `wss://api.deepgram.com/v1/listen?${queryParams.toString()}`;
  
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl, ['token', DEEPGRAM_API_KEY || '']);

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

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        const isFinal = data.is_final;

        if (transcript && transcript.trim()) {
          onTranscript(transcript, isFinal);
        }
      } catch (err) {
        console.error('[Deepgram] Error parsing message:', err);
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
