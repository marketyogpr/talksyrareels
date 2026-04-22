-- Add new columns to posts table for enhanced social media features
-- This script should be run ONLY if the posts table already exists
-- If columns already exist, they will be skipped

-- Check if posts table exists and add missing columns
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE
-- So run these one at a time and ignore errors for columns that already exist

ALTER TABLE posts ADD COLUMN location TEXT;
ALTER TABLE posts ADD COLUMN hashtags TEXT;
ALTER TABLE posts ADD COLUMN mentions TEXT;
ALTER TABLE posts ADD COLUMN allow_comments INTEGER DEFAULT 1;
ALTER TABLE posts ADD COLUMN allow_shares INTEGER DEFAULT 1;
ALTER TABLE posts ADD COLUMN is_pinned INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN is_featured INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN language TEXT;
ALTER TABLE posts ADD COLUMN content_warning TEXT;
ALTER TABLE posts ADD COLUMN scheduled_at TEXT;
ALTER TABLE posts ADD COLUMN expires_at TEXT;
ALTER TABLE posts ADD COLUMN edited_at TEXT;
ALTER TABLE posts ADD COLUMN delete_reason TEXT;
ALTER TABLE posts ADD COLUMN moderation_status TEXT DEFAULT 'pending';
ALTER TABLE posts ADD COLUMN moderation_reason TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_is_featured ON posts(is_featured);
CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON posts(is_pinned);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON posts(expires_at);
CREATE INDEX IF NOT EXISTS idx_posts_moderation_status ON posts(moderation_status);