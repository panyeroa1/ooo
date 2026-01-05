-- Supabase schema for transcript segments
-- Run this in your Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id TEXT NOT NULL,
  speaker_id TEXT,
  source_lang TEXT,
  source_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  target_lang TEXT,
  translated_text TEXT,
  full_transcription TEXT DEFAULT '',
  last_segment_id TEXT,
  CONSTRAINT transcript_segments_meeting_id_key UNIQUE (meeting_id)
);

-- Enable RLS
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for reads and writes
CREATE POLICY "Allow all access to transcript_segments" ON transcript_segments
  FOR ALL USING (true) WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transcript_segments_meeting ON transcript_segments(meeting_id);
