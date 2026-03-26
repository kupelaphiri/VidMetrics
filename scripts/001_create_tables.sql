-- Search history and settings tables for VidMetrics

-- Table to store search history (channel analyses)
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  channel_thumbnail TEXT,
  channel_url TEXT,
  subscriber_count BIGINT DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  videos_analyzed INTEGER DEFAULT 0,
  avg_views BIGINT DEFAULT 0,
  avg_engagement DECIMAL(5,2) DEFAULT 0,
  top_video_title TEXT,
  top_video_views BIGINT,
  search_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_channel_id ON search_history(channel_id);

-- Table to store user settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO user_settings (setting_key, setting_value)
VALUES 
  ('default_videos', '{"value": 50}'::jsonb),
  ('auto_export', '{"enabled": false}'::jsonb),
  ('notifications', '{"enabled": true}'::jsonb),
  ('theme', '{"value": "dark"}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
