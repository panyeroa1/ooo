
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;
    const language = formData.get('language') as string || 'en';

    if (!audioBlob) {
      return new NextResponse('Missing audio data', { status: 400 });
    }

    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return new NextResponse('Deepgram API key not configured', { status: 503 });
    }

    // Convert blob to buffer
    const arrayBuffer = await audioBlob.arrayBuffer();

    // Use the parameters from the user's provided endpoint template
    let dgUrl = 'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=multi';
    
    // If the client explicitly sent auto or another language, we could override, 
    // but the user's request suggests "language=multi" is the way to go.
    if (language !== 'auto' && language !== 'multi') {
      // If a specific language is selected in the UI, we respect it
      dgUrl = `https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=${language}`;
    }

    // Call Deepgram API
    const response = await fetch(
      dgUrl,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': audioBlob.type || 'audio/webm',
        },
        body: arrayBuffer,
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Deepgram STT Error:', err);
      return new NextResponse(err, { status: response.status });
    }

    const data = await response.json();
    const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

    return NextResponse.json({ 
      transcript: transcript.trim(),
      confidence: data.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0
    });
  } catch (error) {
    console.error('Orbit STT route error:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
