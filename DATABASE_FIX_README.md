# 🛠️ DATABASE SCHEMA FIX - Posts Table Column Issue

## 🚨 Problem
Flutter app is getting this error during post upload:
```
I/flutter: TalkSyra Critical Upload Error: Exception: API Error: 500 - Database Error: D1_ERROR: table posts has no column named postId: SQLITE_ERROR
```

## 🔍 Root Cause
The `posts` table was created with incorrect column name `postId` instead of `id` as the primary key.

## 🛠️ Solution

### Option 1: Run the Fix Script (Recommended)
```bash
# Deploy the fix script to Cloudflare Workers
wrangler deploy fix_posts_schema.js

# Or run locally
wrangler dev fix_posts_schema.js

# Then call the endpoint
curl https://your-worker-url/fix_posts_schema.js
```

### Option 2: Manual SQL Fix
Run these SQL commands in your D1 database:

```sql
-- Backup existing data
CREATE TABLE posts_backup AS SELECT * FROM posts;

-- Drop incorrect table
DROP TABLE posts;

-- Create correct table
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

-- Create indexes
CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_type ON posts(type);
CREATE INDEX idx_posts_visibility ON posts(visibility);
CREATE INDEX idx_posts_created ON posts(created_at);

-- Migrate data (if backup exists)
INSERT INTO posts (id, user_id, type, caption, visibility, like_count, comment_count, share_count, view_count, created_at, updated_at)
SELECT postId, user_id, type, caption, visibility, like_count, comment_count, share_count, view_count, created_at, updated_at
FROM posts_backup
WHERE postId IS NOT NULL;

-- Clean up
DROP TABLE posts_backup;
```

## ✅ Verification
After running the fix, verify the schema:
```sql
PRAGMA table_info(posts);
```
Should show `id` as the primary key column, not `postId`.

## 🚀 Test Upload
After fixing the schema, try uploading a post again. The error should be resolved.

## 📋 Files Created
- `fix_posts_schema.js` - Cloudflare Worker script to fix the schema
- `fix_posts_table.sql` - SQL commands for manual fix

## ⚠️ Important Notes
- This fix assumes the table had `postId` as the primary key column
- All existing data will be preserved during the migration
- The fix creates proper indexes for performance
- Run this only once to avoid data loss