## 🎯 ENGAGEMENT TABLES - Database Setup Guide

This document explains the three new universal engagement tables added to the database: **Likes**, **Comments**, and **Shares**.

---

## 📋 Table Schema

### 1️⃣ LIKES TABLE
Universal likes table for tracking likes on any entity (posts, reels, comments, etc.)

```sql
CREATE TABLE IF NOT EXISTS likes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, entity_type, entity_id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_likes_entity ON likes(entity_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_type ON likes(entity_type);
```

**Columns:**
- `id` - Unique like identifier
- `user_id` - User who liked the entity
- `entity_type` - Type of entity (post, reel, comment, etc.)
- `entity_id` - ID of the entity being liked
- `created_at` - Timestamp of the like action
- `UNIQUE constraint` - Ensures one like per user per entity (like toggle)

---

### 2️⃣ COMMENTS TABLE
Universal comments table with support for nested replies and soft deletes

```sql
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

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_type ON comments(entity_type);
```

**Columns:**
- `id` - Unique comment identifier
- `user_id` - User who posted the comment
- `entity_type` - Type of entity (post, reel, etc.)
- `entity_id` - ID of the entity being commented on
- `content` - Comment text
- `parent_id` - ID of parent comment (for nested replies)
- `like_count` - Number of likes on this comment
- `is_deleted` - Soft delete flag (0 = visible, 1 = deleted)
- `created_at` - Comment creation timestamp
- `updated_at` - Last update timestamp

---

### 3️⃣ SHARES TABLE
Universal shares table for tracking all share activities

```sql
CREATE TABLE IF NOT EXISTS shares (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  share_type TEXT,
  target_user_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_shares_entity ON shares(entity_id);
CREATE INDEX IF NOT EXISTS idx_shares_user ON shares(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_type ON shares(entity_type);
CREATE INDEX IF NOT EXISTS idx_shares_target ON shares(target_user_id);
```

**Columns:**
- `id` - Unique share identifier
- `user_id` - User who shared the entity
- `entity_type` - Type of entity (post, reel, etc.)
- `entity_id` - ID of the entity being shared
- `share_type` - Type of share (dm, story, public, etc.)
- `target_user_id` - Recipient user (if shared to specific user)
- `created_at` - Share timestamp

---

## 🚀 Setup Instructions

### Option 1: Wrangler CLI (Recommended)

```bash
# Run the migration script to create tables
wrangler d1 execute socialapkdatabase --file ./scripts/add-engagement-tables.js
```

### Option 2: Manual Cloudflare Dashboard
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to Workers → D1
3. Select your database `socialapkdatabase`
4. Go to Console
5. Copy and paste the SQL from `scripts/add-engagement-tables.js`
6. Execute

---

## 📡 API Endpoints

### LIKES API

#### Add Like
```
POST /api/likes/add
Parameters:
  - user_id (required)
  - entity_type (required) - e.g., "post", "reel", "comment"
  - entity_id (required)

Response: { success: true, likeId: "...", message: "Like added" }
```

#### Remove Like
```
POST /api/likes/remove
Parameters:
  - user_id (required)
  - entity_type (required)
  - entity_id (required)

Response: { success: true, message: "Like removed" }
```

#### Check Like Status
```
GET /api/likes/check?user_id=...&entity_type=...&entity_id=...

Response: { liked: boolean, like: {...} }
```

#### Get Likes for Entity
```
GET /api/likes/list?entity_type=...&entity_id=...&limit=50&offset=0

Response: { likes: [...], count: number }
```

#### Get Like Count
```
GET /api/likes/count?entity_type=...&entity_id=...

Response: { count: number }
```

---

### COMMENTS API

#### Add Comment
```
POST /api/comments/add
Parameters:
  - user_id (required)
  - entity_type (required)
  - entity_id (required)
  - content (required)
  - parent_id (optional) - for nested replies

Response: { success: true, commentId: "...", message: "Comment added" }
```

#### Get Comment
```
GET /api/comments/{commentId}

Response: { id, user_id, entity_type, entity_id, content, ... }
```

#### Get Comments for Entity
```
GET /api/comments/list?entity_type=...&entity_id=...&limit=50&offset=0

Response: { comments: [...], count: number }
```

#### Get Comment Replies
```
GET /api/comments/replies?parent_id=...&limit=20&offset=0

Response: { replies: [...] }
```

#### Update Comment
```
POST /api/comments/update
Parameters:
  - comment_id (required)
  - content (required)

Response: { success: true, message: "Comment updated" }
```

#### Delete Comment
```
POST /api/comments/delete
Parameters:
  - comment_id (required)

Response: { success: true, message: "Comment deleted" }
```

#### Like Comment
```
POST /api/comments/like
Parameters:
  - comment_id (required)

Response: { success: true, message: "Comment liked" }
```

#### Unlike Comment
```
POST /api/comments/unlike
Parameters:
  - comment_id (required)

Response: { success: true, message: "Comment unliked" }
```

---

### SHARES API

#### Add Share
```
POST /api/shares/add
Parameters:
  - user_id (required)
  - entity_type (required)
  - entity_id (required)
  - share_type (optional) - e.g., "dm", "story", "public"
  - target_user_id (optional) - recipient user ID

Response: { success: true, shareId: "...", message: "Share recorded" }
```

#### Get Shares for Entity
```
GET /api/shares/list?entity_type=...&entity_id=...&limit=50&offset=0

Response: { shares: [...], count: number }
```

#### Get Share Count
```
GET /api/shares/count?entity_type=...&entity_id=...

Response: { count: number }
```

#### Get User Shares
```
GET /api/shares/user?user_id=...&limit=50&offset=0

Response: { shares: [...] }
```

#### Get Shares Received by User
```
GET /api/shares/received?target_user_id=...&limit=50&offset=0

Response: { shares: [...] }
```

---

## 💾 Database Methods (JavaScript)

All methods are available in the `Database` class:

```javascript
import Database from "./database/db.js";

const db = new Database(env);

// LIKES
await db.addLike(likeId, userId, entityType, entityId);
await db.removeLike(userId, entityType, entityId);
const like = await db.getLike(userId, entityType, entityId);
const likes = await db.getLikes(entityType, entityId, limit, offset);
const count = await db.getLikeCount(entityType, entityId);

// COMMENTS
await db.addComment(commentId, userId, entityType, entityId, content, parentId);
const comment = await db.getComment(commentId);
const comments = await db.getComments(entityType, entityId, limit, offset);
const replies = await db.getCommentReplies(parentId, limit, offset);
await db.updateComment(commentId, content);
await db.deleteComment(commentId);
await db.incrementCommentLikes(commentId);
await db.decrementCommentLikes(commentId);
const commentCount = await db.getCommentCount(entityType, entityId);

// SHARES
await db.addShare(shareId, userId, entityType, entityId, shareType, targetUserId);
const shares = await db.getShares(entityType, entityId, limit, offset);
const shareCount = await db.getShareCount(entityType, entityId);
const userShares = await db.getUserShares(userId, limit, offset);
const receivedShares = await db.getSharesByTargetUser(targetUserId, limit, offset);
```

---

## 🔧 Example Usage

### Like a Post
```javascript
// Add like
const likeId = generateId();
await db.addLike(likeId, "user123", "post", "post456");

// Get like count
const count = await db.getLikeCount("post", "post456");
console.log(`Total likes: ${count}`);

// Check if user liked
const userLike = await db.getLike("user123", "post", "post456");
if (userLike) {
  console.log("User already liked this post");
}
```

### Comment on Post
```javascript
// Add comment
const commentId = generateId();
await db.addComment(
  commentId,
  "user123",
  "post",
  "post456",
  "Great post!",
  null // No parent, it's a top-level comment
);

// Add reply to comment
const replyId = generateId();
await db.addComment(
  replyId,
  "user789",
  "post",
  "post456",
  "Thanks!",
  commentId // Parent comment ID
);

// Get comment with replies
const comment = await db.getComment(commentId);
const replies = await db.getCommentReplies(commentId);
```

### Share Post with Friend
```javascript
const shareId = generateId();
await db.addShare(
  shareId,
  "user123",      // Sharing user
  "post",         // Entity type
  "post456",      // Entity ID
  "dm",           // Share type
  "user789"       // Target user (recipient)
);

// Get all shares received by user
const receivedShares = await db.getSharesByTargetUser("user789");
console.log(`Received ${receivedShares.length} shares`);
```

---

## ✅ Testing Checklist

- [ ] Tables created successfully in D1
- [ ] All indexes created
- [ ] CORS headers configured
- [ ] Like endpoints working (add, remove, check, list, count)
- [ ] Comment endpoints working (add, get, list, reply, update, delete, like)
- [ ] Share endpoints working (add, list, count, user, received)
- [ ] Database methods properly typed and documented
- [ ] API endpoints tested with Postman/curl

---

## 🚨 Important Notes

1. **Soft Deletes**: Comments use `is_deleted` flag instead of hard deletes for data preservation
2. **Unique Constraint**: Likes have a UNIQUE constraint to ensure only one like per user per entity
3. **Indexes**: All tables have proper indexes for fast queries on entity_id, user_id, etc.
4. **Timestamps**: All tables use ISO 8601 format for timestamps
5. **Entity Type**: Use consistent entity_type values across the application (e.g., "post", "reel", "comment")

---

## 📞 Support

For issues or questions, check:
- Database logs in Cloudflare Dashboard
- Worker logs in Cloudflare Console
- Verify table names match exactly (case-sensitive)
- Ensure proper D1 binding in wrangler.toml
