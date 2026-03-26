CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_thumbnail TEXT,
  subscriber_count BIGINT DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  videos_analyzed INTEGER DEFAULT 0,
  avg_views BIGINT DEFAULT 0,
  avg_engagement DECIMAL(5,2) DEFAULT 0,
  searched_at TIMESTAMPTZ DEFAULT NOW(),
  videos_data JSONB,
  user_key TEXT
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_key ON search_history(user_key);

CREATE TABLE IF NOT EXISTS shared_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  videos_to_fetch INTEGER DEFAULT 50,
  auto_export BOOLEAN DEFAULT false,
  export_format TEXT DEFAULT 'csv',
  notifications_enabled BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
