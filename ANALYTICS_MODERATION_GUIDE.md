## 📊 ANALYTICS & MODERATION TABLES - Complete Setup Guide

This document covers 10 new analytics and moderation tables for your database.

---

## 📋 Table Overview

### 📝 Moderation Tables (2)
1. **reports** - Report/flag inappropriate content
2. **blocks** - Block/unblock users

### 📈 Analytics Tables (8)
1. **user_stats** - User-level statistics
2. **post_stats** - Post-level statistics
3. **story_stats** - Story-level statistics
4. **poll_stats** - Poll-level statistics
5. **event_stats** - Event-level statistics
6. **group_stats** - Group-level statistics
7. **content_stats** - Universal content statistics
8. **earnings** - Earnings/monetization tracking
9. **daily_stats** - Daily snapshot analytics

---

## 🗄️ Database Schema

### REPORTS TABLE (Content Reporting)
```sql
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
```

**Columns:**
- `id` - Unique report ID
- `reporter_id` - User who reported
- `entity_type` - Type of entity (post, reel, comment, user, etc.)
- `entity_id` - ID of reported entity
- `reason_code` - Report reason (spam, harassment, abuse, etc.)
- `description` - Detailed reason
- `status` - Report status (pending, reviewed, resolved)
- `created_at` - Report timestamp

---

### BLOCKS TABLE (User Blocking)
```sql
CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(blocker_id, blocked_id)
);
```

**Columns:**
- `id` - Unique block ID
- `blocker_id` - User doing the blocking
- `blocked_id` - User being blocked
- `created_at` - Block timestamp
- `UNIQUE constraint` - One block per pair

---

### USER_STATS TABLE (User Analytics)
```sql
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
```

**Tracked Metrics:**
- Followers/Following count
- Posts published
- Cumulative likes received
- Comments on user's content
- Total views
- Total shares
- Total earnings

---

### POST_STATS TABLE (Post Analytics)
```sql
CREATE TABLE IF NOT EXISTS post_stats (
  post_id TEXT PRIMARY KEY,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Tracked Metrics:**
- Likes
- Comments
- Views
- Shares
- Saves

---

### STORY_STATS TABLE (Story Analytics)
```sql
CREATE TABLE IF NOT EXISTS story_stats (
  story_id TEXT PRIMARY KEY,
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  exit_count INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Tracked Metrics:**
- Views
- Replies
- Shares
- Exit count (when viewed completely)

---

### POLL_STATS TABLE (Poll Analytics)
```sql
CREATE TABLE IF NOT EXISTS poll_stats (
  poll_id TEXT PRIMARY KEY,
  total_votes INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Tracked Metrics:**
- Total votes
- Views
- Shares

---

### EVENT_STATS TABLE (Event Analytics)
```sql
CREATE TABLE IF NOT EXISTS event_stats (
  event_id TEXT PRIMARY KEY,
  view_count INTEGER DEFAULT 0,
  join_count INTEGER DEFAULT 0,
  interested_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Tracked Metrics:**
- Views
- Joins
- Interested
- Shares

---

### GROUP_STATS TABLE (Group Analytics)
```sql
CREATE TABLE IF NOT EXISTS group_stats (
  group_id TEXT PRIMARY KEY,
  member_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  active_members INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Tracked Metrics:**
- Total members
- Posts
- Active members

---

### CONTENT_STATS TABLE (Universal Statistics)
```sql
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
```

**Tracked Metrics:**
- Universal views
- Universal likes
- Universal comments
- Universal shares
- Universal saves

---

### EARNINGS TABLE (Monetization)
```sql
CREATE TABLE IF NOT EXISTS earnings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_type TEXT,
  source_id TEXT,
  amount INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id` - Unique earning ID
- `user_id` - User who earned
- `source_type` - Source type (ads, gifts, subscriptions, etc.)
- `source_id` - ID of earning source
- `amount` - Amount earned
- `created_at` - Earning timestamp

---

### DAILY_STATS TABLE (Daily Analytics)
```sql
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
```

**Daily Snapshot Metrics:**
- Follower/Following counts
- New followers today
- Posts/Reels published
- Views/Likes/Comments/Shares/Saves
- Story and Reel views
- Watch time
- Daily earnings

---

## 🚀 Deployment

### Step 1: Run Migration
```bash
cd /workspaces/talksyrareels
wrangler d1 execute socialapkdatabase --file ./scripts/add-analytics-tables.js
```

### Step 2: Deploy Code
```bash
wrangler deploy
```

---

## 📡 API Endpoints

### REPORTS API (5 endpoints)

#### Report Content
```
POST /api/reports/create
Parameters:
  - reporter_id (required)
  - entity_type (required)
  - entity_id (required)
  - reason_code (required) - "spam", "harassment", "abuse", etc.
  - description (optional)

Response: { success: true, reportId: "..." }
```

#### Get Report
```
GET /api/reports/{reportId}
Response: { id, reporter_id, entity_type, ... }
```

#### Get Reports for Entity
```
GET /api/reports/entity?entity_type=...&entity_id=...&limit=50
Response: { reports: [...] }
```

#### Get Pending Reports
```
GET /api/reports/pending?limit=50&offset=0
Response: { reports: [...] }
```

#### Update Report Status
```
POST /api/reports/status
Parameters:
  - report_id (required)
  - status (required) - "pending", "reviewed", "resolved"

Response: { success: true }
```

---

### BLOCKS API (4 endpoints)

#### Block User
```
POST /api/blocks/add
Parameters:
  - blocker_id (required)
  - blocked_id (required)

Response: { success: true, blockId: "..." }
```

#### Unblock User
```
POST /api/blocks/remove
Parameters:
  - blocker_id (required)
  - blocked_id (required)

Response: { success: true }
```

#### Check if Blocked
```
GET /api/blocks/check?blocker_id=...&blocked_id=...
Response: { blocked: true/false }
```

#### Get Blocked Users
```
GET /api/blocks/list?blocker_id=...&limit=50
Response: { blockedUsers: [...] }
```

---

### USER STATS API (2 endpoints)

#### Update User Stats
```
POST /api/stats/user/update
Parameters:
  - user_id (required)
  - followers_count (optional)
  - following_count (optional)
  - posts_count (optional)
  - total_likes (optional)
  - total_comments (optional)
  - total_views (optional)
  - total_shares (optional)
  - total_earnings (optional)

Response: { success: true }
```

#### Get User Stats
```
GET /api/stats/user/{userId}
Response: { user_id, followers_count, following_count, ... }
```

---

### POST STATS API (2 endpoints)

#### Get Post Stats
```
GET /api/stats/post/{postId}
Response: { post_id, like_count, comment_count, ... }
```

#### Increment Post Stat
```
POST /api/stats/post/increment
Parameters:
  - post_id (required)
  - stat_field (required) - "like_count", "comment_count", "view_count", etc.
  - increment (optional, default=1)

Response: { success: true }
```

---

### STORY STATS API (2 endpoints)

#### Get Story Stats
```
GET /api/stats/story/{storyId}
Response: { story_id, view_count, reply_count, ... }
```

#### Increment Story Stat
```
POST /api/stats/story/increment
Parameters:
  - story_id (required)
  - stat_field (required)
  - increment (optional, default=1)

Response: { success: true }
```

---

### POLL STATS API (2 endpoints)

#### Get Poll Stats
```
GET /api/stats/poll/{pollId}
Response: { poll_id, total_votes, view_count, ... }
```

#### Increment Poll Stat
```
POST /api/stats/poll/increment
Parameters:
  - poll_id (required)
  - stat_field (required)
  - increment (optional, default=1)

Response: { success: true }
```

---

### EVENT STATS API (2 endpoints)

#### Get Event Stats
```
GET /api/stats/event/{eventId}
Response: { event_id, view_count, join_count, ... }
```

#### Increment Event Stat
```
POST /api/stats/event/increment
Parameters:
  - event_id (required)
  - stat_field (required)
  - increment (optional, default=1)

Response: { success: true }
```

---

### GROUP STATS API (2 endpoints)

#### Get Group Stats
```
GET /api/stats/group/{groupId}
Response: { group_id, member_count, post_count, ... }
```

#### Increment Group Stat
```
POST /api/stats/group/increment
Parameters:
  - group_id (required)
  - stat_field (required)
  - increment (optional, default=1)

Response: { success: true }
```

---

### CONTENT STATS API (2 endpoints)

#### Get Content Stats
```
GET /api/stats/content?entity_type=...&entity_id=...
Response: { entity_type, entity_id, view_count, like_count, ... }
```

#### Increment Content Stat
```
POST /api/stats/content/increment
Parameters:
  - entity_type (required)
  - entity_id (required)
  - stat_field (required)
  - increment (optional, default=1)

Response: { success: true }
```

---

### EARNINGS API (4 endpoints)

#### Add Earning
```
POST /api/earnings/add
Parameters:
  - user_id (required)
  - source_type (required) - "ads", "gifts", "subscriptions", etc.
  - source_id (optional)
  - amount (required) - Amount in smallest unit

Response: { success: true, earningId: "..." }
```

#### Get User Earnings
```
GET /api/earnings/list?user_id=...&limit=50&offset=0
Response: { earnings: [...] }
```

#### Get Total Earnings
```
GET /api/earnings/total?user_id=...
Response: { total: 5000 }
```

#### Get Earnings by Source
```
GET /api/earnings/source?user_id=...&source_type=...&limit=50
Response: { earnings: [...] }
```

---

### DAILY STATS API (4 endpoints)

#### Update Daily Stat
```
POST /api/daily-stats/update
Parameters:
  - user_id (required)
  - date (optional, default=today)
  - followers (optional)
  - following (optional)
  - new_followers (optional)
  - posts (optional)
  - reels (optional)
  - views (optional)
  - likes (optional)
  - comments (optional)
  - shares (optional)
  - saves (optional)
  - story_views (optional)
  - reel_views (optional)
  - watch_time (optional)
  - earnings (optional)

Response: { success: true, statId: "..." }
```

#### Get Daily Stat for Date
```
GET /api/daily-stats/date?user_id=...&date=2026-04-22
Response: { user_id, date, followers, views, likes, ... }
```

#### Get User Daily Stats
```
GET /api/daily-stats/user?user_id=...&limit=30&offset=0
Response: { stats: [...] }
```

#### Get Daily Stats by Date Range
```
GET /api/daily-stats/range?user_id=...&start_date=2026-04-01&end_date=2026-04-30
Response: { stats: [...] }
```

---

## 💻 Database Methods

All methods available in `Database` class:

### Reports Methods
```javascript
await db.addReport(id, reporterId, entityType, entityId, reasonCode, description);
const report = await db.getReport(reportId);
const reports = await db.getReports(entityType, entityId, limit, offset);
await db.updateReportStatus(reportId, status);
const pending = await db.getPendingReports(limit, offset);
```

### Blocks Methods
```javascript
await db.blockUser(id, blockerId, blockedId);
await db.unblockUser(blockerId, blockedId);
const isBlocked = await db.isBlocked(blockerId, blockedId);
const blocked = await db.getBlockedUsers(blockerId, limit, offset);
const blockedBy = await db.getBlockedByUsers(blockedId, limit, offset);
```

### Stats Methods (All follow similar pattern)
```javascript
// User Stats
await db.updateUserStats(userId, statsObject);
const stats = await db.getUserStats(userId);
await db.incrementUserStat(userId, statField, increment);

// Post Stats
await db.updatePostStats(postId, statsObject);
const stats = await db.getPostStats(postId);
await db.incrementPostStat(postId, statField, increment);

// Story/Poll/Event/Group Stats - Similar pattern
```

### Content Stats Methods
```javascript
await db.updateContentStats(entityType, entityId, statsObject);
const stats = await db.getContentStats(entityType, entityId);
await db.incrementContentStat(entityType, entityId, statField, increment);
```

### Earnings Methods
```javascript
await db.addEarning(id, userId, sourceType, sourceId, amount);
const earnings = await db.getUserEarnings(userId, limit, offset);
const total = await db.getTotalEarnings(userId);
const bySource = await db.getEarningsBySource(userId, sourceType, limit, offset);
```

### Daily Stats Methods
```javascript
await db.addDailyStat(id, userId, date, statsObject);
const stat = await db.getDailyStat(userId, date);
const stats = await db.getUserDailyStats(userId, limit, offset);
const range = await db.getDailyStatsByDateRange(userId, startDate, endDate);
```

---

## 🔑 Important Notes

1. **Automatic Timestamps**: All tables have `updated_at` or `created_at`
2. **Indexes**: All tables indexed on frequently queried columns
3. **UNIQUE Constraints**: blocks and daily_stats have UNIQUE constraints
4. **Soft Reporting**: Reports can be reviewed multiple times
5. **Aggregated Stats**: Use these for fast data access, not real-time
6. **Daily Snapshots**: daily_stats upserts on unique(user_id, date)

---

## ✅ Testing

```bash
# Add report
curl -X POST "http://localhost:8787/api/reports/create" \
  -d "reporter_id=u1&entity_type=post&entity_id=p1&reason_code=spam"

# Block user
curl -X POST "http://localhost:8787/api/blocks/add" \
  -d "blocker_id=u1&blocked_id=u2"

# Update user stats
curl -X POST "http://localhost:8787/api/stats/user/update" \
  -d "user_id=u1&followers_count=100&total_likes=500"

# Get post stats
curl "http://localhost:8787/api/stats/post/p1"

# Add earning
curl -X POST "http://localhost:8787/api/earnings/add" \
  -d "user_id=u1&source_type=ads&amount=100"

# Update daily stats
curl -X POST "http://localhost:8787/api/daily-stats/update" \
  -d "user_id=u1&views=50&likes=10"
```

---

**All analytics and moderation features are ready! 🚀**
