/**
 * DATABASE SCHEMA FIX - POSTS TABLE COLUMN ISSUE
 * Fix the posts table to use correct column names
 */

-- Check current posts table schema
PRAGMA table_info(posts);

-- If the table has 'postId' column instead of 'id', we need to fix it
-- First, check if 'postId' column exists
SELECT sql FROM sqlite_master WHERE type='table' AND name='posts';

-- If the table was created with wrong column name, we need to recreate it
-- BACKUP existing data first (if any)
CREATE TABLE posts_backup AS SELECT * FROM posts;

-- Drop the incorrect table
DROP TABLE posts;

-- Create the correct posts table
CREATE TABLE posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    caption TEXT,
    visibility TEXT DEFAULT 'public',
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_type ON posts(type);
CREATE INDEX idx_posts_visibility ON posts(visibility);
CREATE INDEX idx_posts_created ON posts(created_at);

-- If there was data in the backup, migrate it
-- Note: This assumes the old table had 'postId' as primary key
INSERT INTO posts (id, user_id, type, caption, visibility, like_count, comment_count, share_count, view_count, created_at, updated_at)
SELECT postId, user_id, type, caption, visibility, like_count, comment_count, share_count, view_count, created_at, updated_at
FROM posts_backup
WHERE postId IS NOT NULL;

-- Drop the backup table
DROP TABLE posts_backup;

-- Verify the new schema
PRAGMA table_info(posts);

-- Test query to make sure it works
SELECT id, user_id, type, caption FROM posts LIMIT 1;