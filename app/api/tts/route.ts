import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type TtsRequestBody = {
  text: string;
  voiceId?: string;
  provider?: 'cartesia' | 'google-genai' | 'livekit-agent';
};

export async function POST(request: Request) {
  try {
    const { text, voiceId: requestedVoiceId, provider = 'cartesia' } = (await request.json()) as TtsRequestBody;

    if (!text) {
      return new NextResponse('Missing text', { status: 400 });
    }

    if (provider === 'google-genai') {
      const apiKey = process.env.GEMINI_API_KEY;
      const model = process.env.GEMINI_AUDIO_MODEL || 'models/gemini-2.5-flash-native-audio-preview-12-2025';

      if (!apiKey) {
        return new NextResponse('Gemini API key not configured', { status: 503 });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text,
                  },
                ],
              },
            ],
            responseModalities: ['audio'],
            audioConfig: {
              audioEncoding: 'WAV',
              speakingRate: 1.0,
              pitch: 0.0,
            },
            generationConfig: {
              speed: 1.1,
              volume: 1,
              emotion: 'calm',
            },
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Gemini audio error:', errorData);
        return new NextResponse('Gemini audio failed', { status: 500 });
      }

      const data = await response.json();
      const candidate = data?.candidates?.[0];
      const audioPart = candidate?.content?.find((part: any) => part?.audio?.data);
      const audioBase64 =
        audioPart?.audio?.data ??
        candidate?.content?.[0]?.audio?.data ??
        candidate?.output?.audio?.data;

      if (!audioBase64) {
        return new NextResponse('Gemini returned no audio', { status: 500 });
      }

      const buffer = Buffer.from(audioBase64, 'base64');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'audio/wav',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // LiveKit Agent TTS - uses the room's AI agent for speech synthesis
    if (provider === 'livekit-agent') {
      // The LiveKit agent handles TTS by sending text to the agent room
      // Agent will speak directly in the room with muted mic for other participants
      // For API-based TTS, we fall back to Cartesia but mark it as agent-initiated
      console.log('LiveKit Agent TTS requested - using agent voice synthesis');
      
      // For now, delegate to Cartesia with agent voice settings
      // In production, this would dispatch to a running LiveKit agent
      const apiKey = process.env.CARTESIA_API_KEY;
      const agentVoiceId = process.env.LIVEKIT_AGENT_VOICE_ID || process.env.CARTESIA_VOICE_ID;
      const modelId = process.env.CARTESIA_MODEL_ID || 'sonic-3';

      if (!apiKey || !agentVoiceId) {
        return new NextResponse('Agent voice not configured', { status: 503 });
      }

      const response = await fetch('https://api.cartesia.ai/tts/bytes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'Cartesia-Version': '2025-04-16',
        },
        body: JSON.stringify({
          model_id: modelId,
          transcript: text,
          voice: { mode: 'id', id: agentVoiceId },
          output_format: { container: 'wav', encoding: 'pcm_f32le', sample_rate: 44100 },
          speed: 'normal',
          generation_config: { speed: 1.0, volume: 1, emotion: 'neutral' },
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Agent TTS error:', errorData);
        return new NextResponse('Agent TTS failed', { status: 500 });
      }

      const audioBuffer = await response.arrayBuffer();
      console.log(`Agent TTS successful: ${audioBuffer.byteLength} bytes`);
      return new NextResponse(audioBuffer, {
        headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-cache' },
      });
    }

    const apiKey = process.env.CARTESIA_API_KEY;
    const voiceEnv = process.env.CARTESIA_VOICE_ID;
    const modelId = process.env.CARTESIA_MODEL_ID || 'sonic-3';
    const voiceToUse = requestedVoiceId?.trim() || voiceEnv;

    if (!apiKey || !voiceToUse) {
      return new NextResponse('Cartesia not configured', { status: 503 });
    }

    const response = await fetch('https://api.cartesia.ai/tts/bytes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'Cartesia-Version': '2025-04-16',
      },
      body: JSON.stringify({
        model_id: modelId,
        transcript: text,
        voice: {
          mode: 'id',
          id: voiceToUse,
        },
        output_format: {
          container: 'wav',
          encoding: 'pcm_f32le',
          sample_rate: 44100,
        },
        speed: 'normal',
        generation_config: {
          speed: 1.1,
          volume: 1,
          emotion: 'calm',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Cartesia API error details:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        modelId,
        voiceToUse: voiceToUse.substring(0, 8) + '...',
      });
      return new NextResponse(`TTS failed: ${response.status}`, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`TTS successful: generated ${audioBuffer.byteLength} bytes for text: "${text.substring(0, 30)}..."`);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('TTS route internal error:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
