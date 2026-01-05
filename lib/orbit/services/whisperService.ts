
export async function transcribeWithWhisper(audioBlob: Blob): Promise<string> {
  try {
    // 1. Convert Blob to File-like path/data for Gradio
    // Gradio /call/transcribe expects data: [file, task]
    // Since we are in the browser, we need to upload the blob first OR send it as base64 if supported.
    // Most Gradio spaces support uploading a file to /upload and then using that path.
    
    const formData = new FormData();
    formData.append('files', audioBlob, 'audio.webm');
    
    // Upload the file
    const uploadRes = await fetch('https://mrfakename-fast-whisper-turbo.hf.space/gradio_api/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!uploadRes.ok) throw new Error('Upload failed');
    const uploadJson = await uploadRes.json();
    const filePath = uploadJson[0];

    // 2. Call the transcribe endpoint
    const callRes = await fetch('https://mrfakename-fast-whisper-turbo.hf.space/gradio_api/call/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [
          { path: filePath },
          "transcribe"
        ]
      })
    });

    if (!callRes.ok) throw new Error('Transcription call failed');
    const { event_id } = await callRes.json();

    // 3. Listen to the stream for the result
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(`https://mrfakename-fast-whisper-turbo.hf.space/gradio_api/call/transcribe/${event_id}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data) && data.length > 0) {
            // Gradio returns [result]
            resolve(data[0]);
            eventSource.close();
          }
        } catch (e) {
          // Ignore parse errors for keep-alive or intermediate events
        }
      };

      eventSource.onerror = (err) => {
        eventSource.close();
        reject(err);
      };

      // Safety timeout
      setTimeout(() => {
        eventSource.close();
        reject(new Error('Transcription timed out'));
      }, 30000);
    });

  } catch (error) {
    console.error('Whisper Transcription Error:', error);
    throw error;
  }
}
