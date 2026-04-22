## 📊 ANALYTICS & MODERATION TABLES - HINDI GUIDE (हिंदी गाइड)

**10 नए Analytics और Moderation Tables तैयार हैं!** ✅

---

## 📋 Tables क्या हैं?

### 🚨 Moderation Tables (2)
1. **reports** - Content को report/flag करने के लिए
2. **blocks** - Users को block/unblock करने के लिए

### 📈 Analytics Tables (8)
1. **user_stats** - User के statistics
2. **post_stats** - Post के statistics
3. **story_stats** - Story के statistics
4. **poll_stats** - Poll के statistics
5. **event_stats** - Event के statistics
6. **group_stats** - Group के statistics
7. **content_stats** - किसी भी content के stats
8. **earnings** - पैसे tracking करने के लिए
9. **daily_stats** - हर दिन के stats (snapshot)

---

## 🗄️ Database Schema - Simple Hindi Explanation

### REPORTS TABLE (Content Report करना)
```
जब कोई bad post/comment/user को report करना चाहे:

reporter_id = कौन report कर रहा है
entity_type = क्या report हो रहा है (post, comment, user)
entity_id = कौन सा post/comment
reason_code = क्यों? (spam, abuse, harassment)
description = विस्तार से कहना
status = क्या हुआ (pending, reviewed, resolved)
```

### BLOCKS TABLE (User को Block करना)
```
अगर कोई user को block करना चाहे:

blocker_id = किसने block किया
blocked_id = किसको block किया
UNIQUE = एक बार ही एक को block कर सकते हो
```

### USER_STATS TABLE (User के Stats)
```
User के कुल statistics:
- followers_count = कितने followers
- following_count = कितनों को follow करता है
- posts_count = कितने posts दिए
- total_likes = कुल कितने likes पाए
- total_comments = कुल comments पाए
- total_views = कुल views पाए
- total_shares = कुल shares
- total_earnings = कुल earnings
```

### POST_STATS TABLE (Post के Stats)
```
हर post के लिए:
- like_count
- comment_count
- view_count
- share_count
- save_count
```

### STORY_STATS TABLE (Story के Stats)
```
Story के लिए:
- view_count = कितने देखा गया
- reply_count = कितने replies
- share_count = कितना share हुआ
- exit_count = कितने लोग बीच में exit किए
```

### POLL_STATS TABLE (Poll के Stats)
```
Poll के लिए:
- total_votes = कुल votes
- view_count = कितने देखा
- share_count = कितना share
```

### EVENT_STATS TABLE (Event के Stats)
```
Event के लिए:
- view_count
- join_count = कितने join किए
- interested_count = कितने interested
- share_count
```

### GROUP_STATS TABLE (Group के Stats)
```
Group के लिए:
- member_count = कुल members
- post_count = कुल posts
- active_members = कितने active हैं
```

### CONTENT_STATS TABLE (Universal Stats)
```
किसी भी चीज़ के stats:
- entity_type = क्या है (post, reel, comment)
- entity_id = कौन सा
- view_count, like_count, comment_count, share_count, save_count
```

### EARNINGS TABLE (पैसे Tracking)
```
कब कितना पैसा मिला:
- user_id = किसको
- source_type = कहाँ से (ads, gifts, subscriptions)
- source_id = कौन सी चीज़ से
- amount = कितना
```

### DAILY_STATS TABLE (रोज का Snapshot)
```
हर दिन के stats को save करना:
- date = कौन सी तारीख
- followers, following, new_followers
- posts, reels (नई posts/reels दीं)
- views, likes, comments, shares, saves
- story_views, reel_views
- watch_time = कितना देखा गया
- earnings = आज कितना कमाया
```

---

## 🚀 Deploy कैसे करें?

### Step 1: Tables Create करो
```bash
cd /workspaces/talksyrareels

wrangler d1 execute socialapkdatabase --file ./scripts/add-analytics-tables.js
```

### Step 2: Code Deploy करो
```bash
wrangler deploy
```

**बस! अब तैयार है!** ✅

---

## 📡 API Endpoints - कैसे Use करें

### REPORTS API (Report करना)

#### Content को Report करो
```
POST /api/reports/create

Form Data:
  reporter_id = "user123"
  entity_type = "post"
  entity_id = "post456"
  reason_code = "spam"
  description = "यह post गलत है"

Response: { success: true }
```

#### Pending Reports देखो (Admin के लिए)
```
GET /api/reports/pending

Response: { reports: [{...}, {...}] }
```

#### Report Status Update करो
```
POST /api/reports/status

Form Data:
  report_id = "report123"
  status = "resolved"

Response: { success: true }
```

---

### BLOCKS API (Block/Unblock करना)

#### User को Block करो
```
POST /api/blocks/add

Form Data:
  blocker_id = "user123"
  blocked_id = "user456"

Response: { success: true }
```

#### User को Unblock करो
```
POST /api/blocks/remove

Form Data:
  blocker_id = "user123"
  blocked_id = "user456"

Response: { success: true }
```

#### Check करो Block है या नहीं
```
GET /api/blocks/check?blocker_id=user123&blocked_id=user456

Response: { blocked: true/false }
```

#### सभी Blocked Users देखो
```
GET /api/blocks/list?blocker_id=user123

Response: { blockedUsers: [...] }
```

---

### STATS API - User Stats

#### User के Stats Update करो
```
POST /api/stats/user/update

Form Data:
  user_id = "user123"
  followers_count = "1000"
  total_likes = "5000"
  total_views = "50000"
  total_earnings = "10000"

Response: { success: true }
```

#### User के Stats देखो
```
GET /api/stats/user/user123

Response: {
  user_id: "user123",
  followers_count: 1000,
  total_likes: 5000,
  ...
}
```

---

### STATS API - Post Stats

#### Post के Stats देखो
```
GET /api/stats/post/post123

Response: {
  post_id: "post123",
  like_count: 50,
  comment_count: 10,
  view_count: 500,
  share_count: 20
}
```

#### Post का Stat Increment करो (Like, View, etc)
```
POST /api/stats/post/increment

Form Data:
  post_id = "post123"
  stat_field = "like_count"        // or view_count, comment_count
  increment = "1"

Response: { success: true }
```

---

### STATS API - Story Stats

#### Story के Stats deखो
```
GET /api/stats/story/story123

Response: { story_id, view_count, reply_count, share_count }
```

#### Story का Stat Increment करो
```
POST /api/stats/story/increment

Form Data:
  story_id = "story123"
  stat_field = "view_count"
  increment = "1"

Response: { success: true }
```

---

### STATS API - Poll Stats

#### Poll के Stats देखो
```
GET /api/stats/poll/poll123

Response: { poll_id, total_votes, view_count, share_count }
```

#### Poll Stats Increment करो
```
POST /api/stats/poll/increment

Form Data:
  poll_id = "poll123"
  stat_field = "total_votes"
  increment = "1"

Response: { success: true }
```

---

### EARNINGS API (पैसे Tracking)

#### Earning Add करो (जब कोई ad देखे, gift दे, आदि)
```
POST /api/earnings/add

Form Data:
  user_id = "user123"
  source_type = "ads"              // या "gifts", "subscriptions"
  source_id = "ad_campaign_456"
  amount = "100"                   // रुपये

Response: { success: true, earningId: "..." }
```

#### User की Total Earnings देखो
```
GET /api/earnings/total?user_id=user123

Response: { total: 5000 }          // कुल 5000 रुपये कमाए
```

#### सभी Earnings देखो
```
GET /api/earnings/list?user_id=user123&limit=50

Response: { earnings: [...] }
```

#### किसी specific source से कमाई देखो
```
GET /api/earnings/source?user_id=user123&source_type=ads

Response: { earnings: [...] }      // सिर्फ ads से कमाई
```

---

### DAILY_STATS API (रोज की Statistics)

#### आज की Stats Update करो
```
POST /api/daily-stats/update

Form Data:
  user_id = "user123"
  date = "2026-04-22"              // optional, default = आज
  followers = "1000"
  new_followers = "10"
  posts = "2"
  reels = "1"
  views = "5000"
  likes = "500"
  comments = "50"
  shares = "20"
  earnings = "1000"
  watch_time = "120.5"             // मिनटों में

Response: { success: true }
```

#### किसी specific तारीख की Stats देखो
```
GET /api/daily-stats/date?user_id=user123&date=2026-04-22

Response: {
  user_id: "user123",
  date: "2026-04-22",
  followers: 1000,
  views: 5000,
  likes: 500,
  earnings: 1000
}
```

#### आखिरी 30 दिन की Stats देखो
```
GET /api/daily-stats/user?user_id=user123&limit=30

Response: { stats: [{day1}, {day2}, ...] }
```

#### किसी date range की Stats देखो
```
GET /api/daily-stats/range?user_id=user123&start_date=2026-04-01&end_date=2026-04-30

Response: { stats: [{...}, {...}, ...] }
```

---

## 💻 JavaScript में Code Examples

### Reports का Example
```javascript
// Report add करो
const reportId = generateId();
await db.addReport(
  reportId,
  "user123",      // जिसने report किया
  "post",         // क्या report है
  "post456",      // कौन सा post
  "spam",         // कारण
  "यह post spam है"
);

// Pending reports देखो (admin के लिए)
const pending = await db.getPendingReports(50, 0);
pending.forEach(report => {
  console.log(`${report.reporter_id} ने ${report.entity_type} report किया`);
});

// Status update करो
await db.updateReportStatus(reportId, "resolved");
```

### Blocks का Example
```javascript
// Block करो
const blockId = generateId();
await db.blockUser(blockId, "user123", "user456");

// Check करो block है या नहीं
const isBlocked = await db.isBlocked("user123", "user456");
if (isBlocked) {
  console.log("user456 को block किया गया है");
}

// Unblock करो
await db.unblockUser("user123", "user456");

// सभी blocked users देखो
const blocked = await db.getBlockedUsers("user123");
```

### Stats का Example
```javascript
// User stats update करो
await db.updateUserStats("user123", {
  followers_count: 1000,
  total_likes: 5000,
  total_earnings: 10000
});

// Post view increment करो
await db.incrementPostStat("post456", "view_count", 1);

// Story views update करो
await db.incrementStoryStat("story789", "view_count", 5);

// Content stats (universal)
await db.incrementContentStat("post", "post456", "like_count", 1);
```

### Earnings का Example
```javascript
// Ad देखने से earning
const earningId = generateId();
await db.addEarning(
  earningId,
  "user123",
  "ads",
  "ad_campaign_456",
  100  // 100 रुपये मिले
);

// कुल कमाई देखो
const total = await db.getTotalEarnings("user123");
console.log(`कुल कमाई: ${total}`);

// किसी source से कमाई देखो
const adEarnings = await db.getEarningsBySource("user123", "ads", 50, 0);
```

### Daily Stats का Example
```javascript
// आज की stats add करो
const statId = generateId();
await db.addDailyStat(statId, "user123", "2026-04-22", {
  followers: 1000,
  views: 5000,
  likes: 500,
  earnings: 1000,
  watch_time: 120.5
});

// आखिरी 30 दिन की stats देखो
const stats = await db.getUserDailyStats("user123", 30, 0);
stats.forEach(day => {
  console.log(`${day.date}: ${day.views} views, ${day.earnings} earnings`);
});

// Growth देखो
const start = "2026-04-01";
const end = "2026-04-30";
const range = await db.getDailyStatsByDateRange("user123", start, end);
```

---

## ✅ Testing करो

```bash
# Report add करो
curl -X POST "http://localhost:8787/api/reports/create" \
  -d "reporter_id=u1&entity_type=post&entity_id=p1&reason_code=spam"

# Block करो
curl -X POST "http://localhost:8787/api/blocks/add" \
  -d "blocker_id=u1&blocked_id=u2"

# User stats update करो
curl -X POST "http://localhost:8787/api/stats/user/update" \
  -d "user_id=u1&followers_count=100&total_likes=500"

# Post stats देखो
curl "http://localhost:8787/api/stats/post/p1"

# Earning add करो
curl -X POST "http://localhost:8787/api/earnings/add" \
  -d "user_id=u1&source_type=ads&amount=100"

# Daily stats update करो
curl -X POST "http://localhost:8787/api/daily-stats/update" \
  -d "user_id=u1&views=5000&likes=500&earnings=1000"
```

---

## 🎯 अगला Step

1. **Deploy करो**:
   ```bash
   wrangler d1 execute socialapkdatabase --file ./scripts/add-analytics-tables.js
   wrangler deploy
   ```

2. **Documentation पढ़ो**:
   - English: `ANALYTICS_MODERATION_GUIDE.md`
   - यह Hindi guide देखा ही

3. **Frontend से Connect करो** और API endpoints use करो!

---

## 📚 Important Tables Summary

| Table | Purpose | Main Fields |
|-------|---------|------------|
| reports | Content report करना | reporter_id, entity_type, entity_id, status |
| blocks | Users को block करना | blocker_id, blocked_id |
| user_stats | User के कुल stats | followers, posts, total_likes, earnings |
| post_stats | Post के stats | like_count, view_count, comment_count |
| story_stats | Story के stats | view_count, reply_count, share_count |
| poll_stats | Poll के stats | total_votes, view_count |
| event_stats | Event के stats | join_count, interested_count |
| group_stats | Group के stats | member_count, post_count |
| content_stats | Universal stats | entity_type, view_count, like_count |
| earnings | Money tracking | user_id, source_type, amount |
| daily_stats | Daily snapshot | date, followers, views, earnings |

---

**आपका Database अब पूरी तरह Analytics और Moderation के लिए तैयार है! 🚀**

कोई सवाल हो तो documentation पढ़ो या code examples देखो!
