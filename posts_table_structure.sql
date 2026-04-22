-- ========================================
-- POSTS TABLE STRUCTURE
-- Check current posts table columns
-- ========================================

-- Check what columns currently exist
PRAGMA table_info(posts);

-- If posts table doesn't exist, create it
CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'post',
    caption TEXT,
    visibility TEXT DEFAULT 'public',
    location TEXT,
    hashtags TEXT,
    mentions TEXT,
    allow_comments INTEGER DEFAULT 1,
    allow_shares INTEGER DEFAULT 1,
    is_pinned INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    language TEXT,
    content_warning TEXT,
    scheduled_at TEXT,
    expires_at TEXT,
    edited_at TEXT,
    delete_reason TEXT,
    moderation_status TEXT DEFAULT 'pending',
    moderation_reason TEXT,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_is_featured ON posts(is_featured);
CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON posts(is_pinned);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON posts(expires_at);
CREATE INDEX IF NOT EXISTS idx_posts_moderation_status ON posts(moderation_status);
