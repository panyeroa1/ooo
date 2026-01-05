-- Migration: Add admin_config and webhook_config tables
-- Created: 2026-01-06

-- Admin configuration table
CREATE TABLE IF NOT EXISTS public.admin_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read config
CREATE POLICY "Allow authenticated users to read admin config"
  ON public.admin_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert/update config
CREATE POLICY "Allow authenticated users to upsert admin config"
  ON public.admin_config
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Webhook configuration table
CREATE TABLE IF NOT EXISTS public.webhook_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.webhook_config ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read webhooks
CREATE POLICY "Allow authenticated users to read webhooks"
  ON public.webhook_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to manage webhooks
CREATE POLICY "Allow authenticated users to manage webhooks"
  ON public.webhook_config
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default config values
INSERT INTO public.admin_config (key, value) VALUES
  ('translationModel', '"internal"'),
  ('ttsProvider', '"gemini"')
ON CONFLICT (key) DO NOTHING;
