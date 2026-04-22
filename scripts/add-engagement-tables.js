/**
 * DATABASE MIGRATION - Add Engagement Tables (Likes, Comments, Shares)
 * 
 * This script creates three new tables for universal engagement tracking:
 * - likes: Universal likes table for posts, reels, comments, etc.
 * - comments: Universal comments table with nesting support
 * - shares: Universal shares table for tracking all share activities
 * 
 * RUN: wrangler d1 execute socialapkdatabase --file ./scripts/add-engagement-tables.js
 */

// =====================================================================
// CREATE ENGAGEMENT TABLES
// =====================================================================

-- Create Universal Likes Table
CREATE TABLE IF NOT EXISTS likes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, entity_type, entity_id)
);

-- Create Index for faster queries on entity_id
CREATE INDEX IF NOT EXISTS idx_likes_entity ON likes(entity_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_type ON likes(entity_type);

-- Create Universal Comments Table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_id TEXT,
  like_count INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for comments
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_type ON comments(entity_type);

-- Create Universal Shares Table
CREATE TABLE IF NOT EXISTS shares (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  share_type TEXT,
  target_user_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for shares
CREATE INDEX IF NOT EXISTS idx_shares_entity ON shares(entity_id);
CREATE INDEX IF NOT EXISTS idx_shares_user ON shares(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_type ON shares(entity_type);
CREATE INDEX IF NOT EXISTS idx_shares_target ON shares(target_user_id);
