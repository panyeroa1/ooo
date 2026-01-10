/**
 * Transcription Service
 * Provides robust speech-to-text transcription with multiple provider support,
 * error handling, retry logic, and fallback mechanisms.
 */

export interface TranscriptionOptions {
  language?: string;
  model?: string;
  provider?: 'deepgram' | 'assemblyai' | 'web-speech';
  punctuate?: boolean;
  detectLanguage?: boolean;
  smartFormat?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  language?: string;
  provider: string;
  duration?: number;
  isFinal: boolean;
}

export interface StreamTranscriptionOptions extends TranscriptionOptions {
  onTranscript?: (result: TranscriptionResult) => void;
  onInterimTranscript?: (text: string) => void;
  onError?: (error: Error) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

/**
 * Error class for transcription failures
 */
export class TranscriptionError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'TranscriptionError';
  }
}

/**
 * Retry utility with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Transcribe audio blob using Deepgram
 */
export async function transcribeWithDeepgram(
  audioBlob: Blob,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const {
    language = 'multi',
    model = 'nova-2',
    punctuate = true,
    detectLanguage = false,
    smartFormat = true,
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  const transcribe = async (): Promise<TranscriptionResult> => {
    const startTime = Date.now();

    // Build URL with query parameters
    const params = new URLSearchParams({
      model,
      punctuate: String(punctuate),
      smart_format: String(smartFormat),
    });

    if (detectLanguage) {
      params.append('detect_language', 'true');
    } else {
      params.append('language', language);
    }

    const response = await fetch(`/api/orbit/stt?${params.toString()}`, {
      method: 'POST',
      body: await audioBlobToFormData(audioBlob, language),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new TranscriptionError(
        `Deepgram API error: ${errorText}`,
        'deepgram',
        String(response.status),
        response.status >= 500
      );
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    return {
      transcript: data.transcript || '',
      confidence: data.confidence || 0,
      language: data.language,
      provider: 'deepgram',
      duration,
      isFinal: true,
    };
  };

  return retryWithBackoff(transcribe, maxRetries, retryDelay);
}

/**
 * Transcribe audio blob using AssemblyAI
 */
export async function transcribeWithAssemblyAI(
  audioBlob: Blob,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const {
    language = 'en',
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  const transcribe = async (): Promise<TranscriptionResult> => {
    const startTime = Date.now();

    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('language', language);

    const response = await fetch('/api/assemblyai/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new TranscriptionError(
        `AssemblyAI API error: ${errorText}`,
        'assemblyai',
        String(response.status),
        response.status >= 500
      );
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    return {
      transcript: data.transcript || '',
      confidence: data.confidence || 0,
      language: data.language,
      provider: 'assemblyai',
      duration,
      isFinal: true,
    };
  };

  return retryWithBackoff(transcribe, maxRetries, retryDelay);
}

/**
 * Transcribe audio using Web Speech API (browser-based)
 */
export async function transcribeWithWebSpeech(
  audioBlob: Blob,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const { language = 'en-US' } = options;

  return new Promise((resolve, reject) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      reject(new TranscriptionError(
        'Web Speech API not supported',
        'web-speech',
        'NOT_SUPPORTED',
        false
      ));
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;

    const startTime = Date.now();

    recognition.onresult = (event: any) => {
      const result = event.results[0];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;
      const duration = Date.now() - startTime;

      resolve({
        transcript,
        confidence,
        provider: 'web-speech',
        duration,
        isFinal: true,
      });
    };

    recognition.onerror = (event: any) => {
      reject(new TranscriptionError(
        `Web Speech error: ${event.error}`,
        'web-speech',
        event.error,
        false
      ));
    };

    // Play audio and start recognition
    const audio = new Audio(URL.createObjectURL(audioBlob));
    audio.play().then(() => {
      recognition.start();
    }).catch(reject);
  });
}

/**
 * Main transcription function with automatic provider fallback
 */
export async function transcribeAudio(
  audioBlob: Blob,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const { provider = 'deepgram' } = options;
  
  const providers = [provider, 'deepgram', 'assemblyai', 'web-speech'].filter(
    (p, i, arr) => arr.indexOf(p) === i
  ) as Array<'deepgram' | 'assemblyai' | 'web-speech'>;

  let lastError: Error | null = null;

  for (const currentProvider of providers) {
    try {
      switch (currentProvider) {
        case 'deepgram':
          return await transcribeWithDeepgram(audioBlob, options);
        case 'assemblyai':
          return await transcribeWithAssemblyAI(audioBlob, options);
        case 'web-speech':
          return await transcribeWithWebSpeech(audioBlob, options);
      }
    } catch (error) {
      lastError = error as Error;
      console.warn(`Provider ${currentProvider} failed:`, error);
      
      // If error is not retryable, try next provider
      if (error instanceof TranscriptionError && !error.retryable) {
        continue;
      }
    }
  }

  throw lastError || new TranscriptionError(
    'All transcription providers failed',
    'all',
    'ALL_FAILED',
    false
  );
}

/**
 * Create a real-time transcription connection
 */
export class RealtimeTranscription {
  private connection: any = null;
  private isActive = false;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  
  constructor(
    private options: StreamTranscriptionOptions = {}
  ) {}

  async start(deviceId?: string): Promise<void> {
    if (this.isActive) {
      throw new Error('Transcription already active');
    }

    const { provider = 'deepgram' } = this.options;

    try {
      // Get microphone access
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      };
      
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      switch (provider) {
        case 'deepgram':
          await this.startDeepgramStream();
          break;
        case 'assemblyai':
          await this.startAssemblyAIStream();
          break;
        case 'web-speech':
          await this.startWebSpeechStream();
          break;
      }

      this.isActive = true;
      this.options.onSpeechStart?.();
    } catch (error) {
      this.cleanup();
      this.options.onError?.(error as Error);
      throw error;
    }
  }

  private async startDeepgramStream(): Promise<void> {
    // Deepgram streaming implementation using existing useDeepgramTranscription logic
    const { createClient, LiveTranscriptionEvents } = await import('@deepgram/sdk');
    
    // Get token from API
    const response = await fetch('/api/deepgram/token');
    const { token } = await response.json();
    
    const client = createClient(token);
    const connection = client.listen.live({
      model: this.options.model || 'nova-2',
      language: this.options.language || 'multi',
      punctuate: this.options.punctuate ?? true,
      smart_format: this.options.smartFormat ?? true,
    });

    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log('Deepgram connection opened');
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      const transcript = data.channel.alternatives[0].transcript;
      const confidence = data.channel.alternatives[0].confidence;
      const isFinal = data.is_final;

      if (!transcript) return;

      if (isFinal) {
        this.options.onTranscript?.({
          transcript,
          confidence,
          provider: 'deepgram',
          isFinal: true,
        });
      } else {
        this.options.onInterimTranscript?.(transcript);
      }
    });

    connection.on(LiveTranscriptionEvents.Error, (error: any) => {
      this.options.onError?.(error);
    });

    this.connection = connection;

    // Start sending audio
    if (this.mediaStream) {
      this.startAudioCapture(connection);
    }
  }

  private async startAssemblyAIStream(): Promise<void> {
    // AssemblyAI streaming implementation
    const ASSEMBLYAI_API_KEY = process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY;
    const url = `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&token=${ASSEMBLYAI_API_KEY}`;
    
    const socket = new WebSocket(url);
    
    socket.onopen = () => {
      console.log('AssemblyAI connection opened');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'Turn' && data.transcript) {
        this.options.onTranscript?.({
          transcript: data.transcript,
          confidence: 0,
          provider: 'assemblyai',
          isFinal: data.turn_is_formatted,
        });
      }
    };

    socket.onerror = (error) => {
      this.options.onError?.(new Error('AssemblyAI WebSocket error'));
    };

    this.connection = socket;

    // Setup audio processing for AssemblyAI
    if (this.mediaStream) {
      this.startAudioCaptureAssemblyAI(socket);
    }
  }

  private async startWebSpeechStream(): Promise<void> {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      throw new TranscriptionError(
        'Web Speech API not supported',
        'web-speech',
        'NOT_SUPPORTED',
        false
      );
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = this.options.language || 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        if (result.isFinal) {
          this.options.onTranscript?.({
            transcript,
            confidence,
            provider: 'web-speech',
            isFinal: true,
          });
        } else {
          this.options.onInterimTranscript?.(transcript);
        }
      }
    };

    recognition.onerror = (event: any) => {
      this.options.onError?.(new Error(`Web Speech error: ${event.error}`));
    };

    recognition.start();
    this.connection = recognition;
  }

  private startAudioCapture(connection: any): void {
    if (!this.mediaStream) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass({ sampleRate: 16000 });
    
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = this.floatTo16BitPCM(inputData);
      
      if (connection.getReadyState() === 1) {
        connection.send(pcm16);
      }
    };

    source.connect(processor);
    processor.connect(this.audioContext.destination);
  }

  private startAudioCaptureAssemblyAI(socket: WebSocket): void {
    if (!this.mediaStream) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass({ sampleRate: 16000 });
    
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (socket.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = this.floatTo16BitPCM(inputData);
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
        socket.send(JSON.stringify({ audio_data: base64 }));
      }
    };

    source.connect(processor);
    processor.connect(this.audioContext.destination);
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  stop(): void {
    this.cleanup();
    this.options.onSpeechEnd?.();
  }

  private cleanup(): void {
    if (this.connection) {
      if (typeof this.connection.close === 'function') {
        this.connection.close();
      } else if (typeof this.connection.stop === 'function') {
        this.connection.stop();
      }
      this.connection = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.isActive = false;
  }

  isListening(): boolean {
    return this.isActive;
  }
}

/**
 * Helper function to convert audio blob to FormData
 */
async function audioBlobToFormData(audioBlob: Blob, language: string): Promise<FormData> {
  const formData = new FormData();
  formData.append('audio', audioBlob);
  formData.append('language', language);
  return formData;
}
