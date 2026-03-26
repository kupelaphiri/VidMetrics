# VidMetrics — YouTube Channel Analytics

A full-stack analytics tool for researching and benchmarking YouTube channels. Built with Next.js 16, Supabase, and the YouTube Data API v3.

![Dashboard showing channel stats, AI insights, and video performance table]

## Features

- **Channel analytics** — views, engagement rate, upload frequency, revenue estimate, viral velocity
- **AI insights** — Llama 3.3-powered analysis via Groq (free tier, no credit card)
- **Channel comparison** — head-to-head stats between any two channels
- **Best day to post** — bar chart of average views by day of week
- **Title keyword analysis** — which keywords correlate with higher views
- **Search history** — scoped to your YouTube API key, stored in Supabase
- **Shareable reports** — generate a read-only public link for any analysis
- **Export** — download video data as CSV or JSON
- **Mobile responsive** — card layout on mobile, full table on desktop
- **Dark / light theme** — persisted via `next-themes`

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| UI | Tailwind CSS v4 + shadcn/ui + Recharts |
| Database | Supabase (Postgres) |
| AI | Groq — Llama 3.3 70B (free tier) |
| Data | YouTube Data API v3 |
| Deployment | Vercel |

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/vid-metrics.git
cd vid-metrics
npm install
```

### 2. Get API keys

| Service | Where to get it | Cost |
|---------|----------------|------|
| YouTube Data API v3 | [Google Cloud Console](https://console.cloud.google.com) → Enable "YouTube Data API v3" → Create API key | Free (10,000 units/day) |
| Groq | [console.groq.com](https://console.groq.com) → API Keys | Free (no card required) |
| Supabase | [supabase.com](https://supabase.com) → New project | Free tier |

### 3. Set up environment variables

Create a `.env.local` file in the root:

```env
YOUTUBE_API_KEY=your_youtube_api_key_here
GROQ_API_KEY=your_groq_api_key_here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key
```

> **Note:** `YOUTUBE_API_KEY` is the server-side fallback key. Users can also supply their own key in the app's Settings page — this scopes their search history to them specifically.

### 4. Set up the database

In your Supabase project, open the **SQL Editor** and run the migration:

```sql
-- From: supabase/migrations/20260326000000_initial_schema.sql

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
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel

1. Push the repo to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Add the four environment variables from `.env.local` under **Project Settings → Environment Variables**
4. Deploy — Vercel auto-detects Next.js, no config needed

---

## Project Structure

```
app/
  page.tsx                  # Main dashboard
  compare/page.tsx          # Side-by-side channel comparison
  reports/page.tsx          # Search history
  settings/page.tsx         # API key + preferences
  share/[id]/page.tsx       # Read-only shared report view
  api/
    youtube/route.ts        # YouTube Data API wrapper (with pagination + API key fallback)
    insights/route.ts       # Groq AI insights endpoint
    history/route.ts        # Search history CRUD (Supabase)
    share/route.ts          # Shareable report link generation
    settings/route.ts       # User settings persistence

components/
  ai-insights.tsx           # Collapsible AI analysis card
  channel-header.tsx        # Channel banner with fallback avatar
  channel-input.tsx         # URL input with validation
  performance-charts.tsx    # Recharts: views over time, engagement, best day, keywords
  stats-cards.tsx           # 6-card grid: views, engagement, revenue estimate, velocity, consistency
  video-table.tsx           # Paginated, filterable video table (mobile card / desktop table)
  header.tsx                # Nav with mobile hamburger overlay

lib/
  types.ts                  # Shared TypeScript interfaces
  supabase/                 # Supabase client (browser) and server helpers

supabase/
  migrations/               # SQL migration files
```

---

## How I Approached the Build

### API key strategy
Since this app has no accounts, user identity is tied to their YouTube API key. The key is stored in `localStorage`, sent as an `X-Api-Key` header, and SHA-256 hashed server-side before being stored in the database as `user_key`. This means search history is naturally scoped per person without requiring auth.

If a user supplies an invalid key, the server detects the YouTube API error code (`keyInvalid`, `accessNotConfigured`, etc.), falls back to the system key, and returns a warning flag in the response. The frontend shows an amber banner and skips saving to history — since we can't attribute it to the right user.

### YouTube API pagination
The YouTube API caps `maxResults` at 50 per request. To support fetching up to 200 videos, I loop using `nextPageToken` to collect playlist items across multiple pages, then batch the `videos.list` calls in groups of 50 (the API's limit for that endpoint).

### AI insights
The prompt is intentionally compact — aggregate stats only, no individual video titles — to stay well within Groq's free tier token limits (6,000 tokens/min). Groq runs Llama 3.3 70B, which is strong enough for this use case and has a generous free tier (30 req/min, 14,400 req/day).

### Shareable reports
When a user clicks Share, the full `AnalyticsData` object is POSTed to Supabase and stored as JSONB. A UUID is returned and the URL is copied to clipboard. The `/share/[id]` route fetches and renders the data in a read-only view — no auth, no expiry, works for anyone with the link.

### Theme switching
Uses `next-themes` with `attribute="class"` so Tailwind's `.dark` class is applied to `<html>`. CSS variables are redefined under `.dark` — no JS-in-CSS, no flash of wrong theme.

### Mobile responsiveness
The video table has two render paths: a card list (`block md:hidden`) and a full table (`hidden md:block`). The mobile nav dropdown is `position: absolute` so it overlays content rather than pushing it down, with `backdrop-blur` to obscure the content behind it.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `YOUTUBE_API_KEY` | Yes | Server-side fallback YouTube API key |
| `GROQ_API_KEY` | Yes | Groq API key for AI insights |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Yes | Supabase anon/public key |
