/**
 * DATABASE MIGRATION - Add Analytics & Moderation Tables
 * 
 * Tables for:
 * - Reporting content
 * - Blocking users
 * - Analytics tracking (stats for posts, stories, polls, users, etc.)
 * - Earnings tracking
 * - Daily stats snapshots
 * 
 * RUN: wrangler d1 execute socialapkdatabase --file ./scripts/add-analytics-tables.js
 */

-- =====================================================================
-- MODERATION TABLES
-- =====================================================================

-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  reason_code TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_entity ON reports(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Blocks Table
CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);

-- =====================================================================
-- ANALYTICS & STATS TABLES
-- =====================================================================

-- User Statistics
CREATE TABLE IF NOT EXISTS user_stats (
  user_id TEXT PRIMARY KEY,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  total_earnings INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_stats_updated ON user_stats(updated_at);

-- Post Statistics
CREATE TABLE IF NOT EXISTS post_stats (
  post_id TEXT PRIMARY KEY,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_post_stats_updated ON post_stats(updated_at);

-- Story Statistics
CREATE TABLE IF NOT EXISTS story_stats (
  story_id TEXT PRIMARY KEY,
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  exit_count INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_story_stats_updated ON story_stats(updated_at);

-- Poll Statistics
CREATE TABLE IF NOT EXISTS poll_stats (
  poll_id TEXT PRIMARY KEY,
  total_votes INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_poll_stats_updated ON poll_stats(updated_at);

-- Event Statistics
CREATE TABLE IF NOT EXISTS event_stats (
  event_id TEXT PRIMARY KEY,
  view_count INTEGER DEFAULT 0,
  join_count INTEGER DEFAULT 0,
  interested_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_stats_updated ON event_stats(updated_at);

-- Group Statistics
CREATE TABLE IF NOT EXISTS group_stats (
  group_id TEXT PRIMARY KEY,
  member_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  active_members INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_group_stats_updated ON group_stats(updated_at);

-- Universal Content Statistics
CREATE TABLE IF NOT EXISTS content_stats (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_content_stats_entity ON content_stats(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_content_stats_updated ON content_stats(updated_at);

-- =====================================================================
-- EARNINGS & MONETIZATION
-- =====================================================================

-- Earnings Table
CREATE TABLE IF NOT EXISTS earnings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_type TEXT,
  source_id TEXT,
  amount INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_earnings_user ON earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_source ON earnings(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_earnings_date ON earnings(created_at);

-- =====================================================================
-- DAILY ANALYTICS
-- =====================================================================

-- Daily Statistics (Daily Snapshot)
CREATE TABLE IF NOT EXISTS daily_stats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  new_followers INTEGER DEFAULT 0,
  posts INTEGER DEFAULT 0,
  reels INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  story_views INTEGER DEFAULT 0,
  reel_views INTEGER DEFAULT 0,
  watch_time REAL DEFAULT 0,
  earnings INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_user ON daily_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON daily_stats(user_id, date);
