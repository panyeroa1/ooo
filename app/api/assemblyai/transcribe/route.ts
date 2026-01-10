import { NextResponse } from 'next/server';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;
    const language = formData.get('language') as string || 'en';

    if (!audioBlob) {
      return new NextResponse('Missing audio data', { status: 400 });
    }

    if (!ASSEMBLYAI_API_KEY) {
      return new NextResponse('AssemblyAI API key not configured', { status: 503 });
    }

    // Step 1: Upload audio file
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLYAI_API_KEY,
      },
      body: await audioBlob.arrayBuffer(),
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      console.error('AssemblyAI upload error:', error);
      return new NextResponse(error, { status: uploadResponse.status });
    }

    const { upload_url } = await uploadResponse.json();

    // Step 2: Request transcription
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_code: language,
        punctuate: true,
        format_text: true,
      }),
    });

    if (!transcriptResponse.ok) {
      const error = await transcriptResponse.text();
      console.error('AssemblyAI transcription error:', error);
      return new NextResponse(error, { status: transcriptResponse.status });
    }

    const { id: transcriptId } = await transcriptResponse.json();

    // Step 3: Poll for completion
    let transcript = null;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max wait

    while (attempts < maxAttempts) {
      const pollResponse = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          headers: {
            'Authorization': ASSEMBLYAI_API_KEY,
          },
        }
      );

      if (!pollResponse.ok) {
        const error = await pollResponse.text();
        console.error('AssemblyAI polling error:', error);
        return new NextResponse(error, { status: pollResponse.status });
      }

      const result = await pollResponse.json();

      if (result.status === 'completed') {
        transcript = result;
        break;
      } else if (result.status === 'error') {
        return new NextResponse(`Transcription failed: ${result.error}`, { status: 500 });
      }

      // Wait 1 second before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!transcript) {
      return new NextResponse('Transcription timeout', { status: 504 });
    }

    return NextResponse.json({
      transcript: transcript.text || '',
      confidence: transcript.confidence || 0,
      language: transcript.language_code,
    });
  } catch (error: any) {
    console.error('AssemblyAI route error:', error);
    return new NextResponse(error.message || 'Internal error', { status: 500 });
  }
}
