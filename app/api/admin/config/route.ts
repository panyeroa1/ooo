import { NextResponse } from 'next/server';
import { supabase } from '@/lib/orbit/services/supabaseClient';

export const runtime = 'nodejs';

interface AdminConfig {
  translationModel?: 'ollama-cloud' | 'gemini-live' | 'internal';
  ttsProvider?: 'gemini' | 'deepgram' | 'cartesia';
  ollamaCloudUrl?: string;
  ollamaCloudApiKey?: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

export async function GET() {
  try {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Fetch all config values
    const { data, error } = await supabase
      .from('admin_config')
      .select('key, value');

    if (error) {
      console.error('Error fetching admin config:', error);
      // Return defaults if table doesn't exist yet
      return NextResponse.json({
        translationModel: 'internal',
        ttsProvider: 'gemini',
      });
    }

    // Convert array of {key, value} to object
    const config: AdminConfig = {};
    data?.forEach((item: { key: string; value: any }) => {
      config[item.key as keyof AdminConfig] = item.value;
    });

    // Return with defaults
    return NextResponse.json({
      translationModel: config.translationModel || 'internal',
      ttsProvider: config.ttsProvider || 'gemini',
      ollamaCloudUrl: config.ollamaCloudUrl,
      ollamaCloudApiKey: config.ollamaCloudApiKey,
      webhookUrl: config.webhookUrl,
      webhookSecret: config.webhookSecret,
    });
  } catch (error) {
    console.error('Internal error fetching admin config:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

// POST: Save admin config
export async function POST(request: Request) {
  try {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const config: AdminConfig = await request.json();

    // Upsert each config key
    const configEntries = Object.entries(config).filter(([_, value]) => value !== undefined);
    
    for (const [key, value] of configEntries) {
      const { error } = await supabase
        .from('admin_config')
        .upsert({
          key,
          value,
          updated_by: session.user.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error(`Error upserting config key ${key}:`, error);
        return new NextResponse(`Failed to save ${key}`, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Internal error saving admin config:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
