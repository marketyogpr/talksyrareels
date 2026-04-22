## 📱 ENGAGEMENT TABLES - HINDI SETUP GUIDE (हिंदी गाइड)

### ✅ Kya Kiya Gaya (What's Been Done)

Aapne jo teen naye tables manga the, sab complete ho gaye hain:

1. **Likes Table** ❤️ - किसी भी चीज़ को like करने के लिए
2. **Comments Table** 💬 - Comments और replies के लिए  
3. **Shares Table** 📤 - Posts/Reels को share करने के लिए

---

## 🗄️ Database Tables (SQL)

### 1. LIKES TABLE (Universal ❤️)
```sql
CREATE TABLE IF NOT EXISTS likes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,          -- "post", "reel", "comment" etc
  entity_id TEXT NOT NULL,             -- किस चीज़ को like किया
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, entity_type, entity_id)
);
```

**Example:**
- User "u123" ने Post "p456" को like किया
- `entity_type = "post"`, `entity_id = "p456"`

---

### 2. COMMENTS TABLE (Universal 💬)
```sql
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,          -- किस चीज़ पर comment
  entity_id TEXT NOT NULL,
  content TEXT NOT NULL,               -- Comment का text
  parent_id TEXT,                      -- Reply के लिए (nested comments)
  like_count INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,        -- Soft delete (data सुरक्षित रहता है)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Example Hierarchy:**
```
Post "p456" (entity_id)
├── Comment "c1" (parent_id = NULL)
│   ├── Reply "c2" (parent_id = "c1")
│   └── Reply "c3" (parent_id = "c1")
└── Comment "c4" (parent_id = NULL)
    └── Reply "c5" (parent_id = "c4")
```

---

### 3. SHARES TABLE (Universal 📤)
```sql
CREATE TABLE IF NOT EXISTS shares (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,               -- किसने share किया
  entity_type TEXT NOT NULL,           -- क्या share किया
  entity_id TEXT NOT NULL,
  share_type TEXT,                     -- "dm", "story", "public"
  target_user_id TEXT,                 -- किसको share किया (optional)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Example:**
- User "u123" ने Post "p456" को DM के through User "u789" को share किया
- `share_type = "dm"`, `target_user_id = "u789"`

---

## 🚀 Setup करने के लिए (Setup Instructions)

### Option 1: Terminal से Wrangler के साथ (सबसे आसान)
```bash
cd /workspaces/talksyrareels

# Database में tables create करने के लिए
wrangler d1 execute socialapkdatabase --file ./scripts/add-engagement-tables.js
```

### Option 2: Cloudflare Dashboard से manually
1. [Cloudflare Dashboard](https://dash.cloudflare.com) खोलें
2. Workers → D1 जाएं
3. `socialapkdatabase` select करें
4. Console में जाएं
5. `scripts/add-engagement-tables.js` से SQL copy करें
6. Paste करके Execute करें

---

## 📡 API Endpoints - कैसे Use करें

### LIKES API

#### ❤️ Like Add करने के लिए
```
POST /api/likes/add

Form Data:
  user_id = "user123"
  entity_type = "post"              // "post", "reel", "comment"
  entity_id = "post456"

Response: { success: true, likeId: "..." }
```

#### ❤️ Like Remove करने के लिए
```
POST /api/likes/remove

Form Data:
  user_id = "user123"
  entity_type = "post"
  entity_id = "post456"

Response: { success: true }
```

#### ❤️ Check करना कि User ने Like किया या नहीं
```
GET /api/likes/check?user_id=user123&entity_type=post&entity_id=post456

Response: { liked: true/false, like: {...} }
```

#### ❤️ Total Likes देखना
```
GET /api/likes/count?entity_type=post&entity_id=post456

Response: { count: 42 }
```

#### ❤️ सभी Likes देखना
```
GET /api/likes/list?entity_type=post&entity_id=post456&limit=50&offset=0

Response: { likes: [...], count: 42 }
```

---

### COMMENTS API

#### 💬 Comment Add करना
```
POST /api/comments/add

Form Data:
  user_id = "user123"
  entity_type = "post"
  entity_id = "post456"
  content = "बहुत अच्छा post है!"
  parent_id = null                    // Reply के लिए comment ID डालें

Response: { success: true, commentId: "..." }
```

#### 💬 Comment देखना
```
GET /api/comments/{commentId}

Response: { id, user_id, content, like_count, ... }
```

#### 💬 Post पर सभी Comments देखना
```
GET /api/comments/list?entity_type=post&entity_id=post456&limit=50&offset=0

Response: { comments: [...], count: 10 }
```

#### 💬 Comment पर Replies देखना (nested comments)
```
GET /api/comments/replies?parent_id=comment123&limit=20&offset=0

Response: { replies: [...] }
```

#### 💬 Comment Edit करना
```
POST /api/comments/update

Form Data:
  comment_id = "comment123"
  content = "नया text यहाँ"

Response: { success: true }
```

#### 💬 Comment Delete करना
```
POST /api/comments/delete

Form Data:
  comment_id = "comment123"

Response: { success: true }
```

#### 💬 Comment पर Like करना
```
POST /api/comments/like

Form Data:
  comment_id = "comment123"

Response: { success: true }
```

---

### SHARES API

#### 📤 Post/Reel Share करना
```
POST /api/shares/add

Form Data:
  user_id = "user123"
  entity_type = "post"
  entity_id = "post456"
  share_type = "dm"                   // "dm", "story", "public"
  target_user_id = "user789"          // जिसको share करना है

Response: { success: true, shareId: "..." }
```

#### 📤 कितने बार Share हुआ
```
GET /api/shares/count?entity_type=post&entity_id=post456

Response: { count: 15 }
```

#### 📤 सभी Shares देखना
```
GET /api/shares/list?entity_type=post&entity_id=post456&limit=50&offset=0

Response: { shares: [...], count: 15 }
```

#### 📤 User के Shares देखना
```
GET /api/shares/user?user_id=user123&limit=50&offset=0

Response: { shares: [...] }
```

#### 📤 किसी User को मिले Shares
```
GET /api/shares/received?target_user_id=user123&limit=50&offset=0

Response: { shares: [...] }
```

---

## 💻 JavaScript Code Examples

### Like Add करने के लिए
```javascript
// User "u1" ने Post "p1" को like किया
const likeId = generateId();
await db.addLike(likeId, "u1", "post", "p1");

// Check करना कि like किया या नहीं
const userLike = await db.getLike("u1", "post", "p1");
if (userLike) {
  console.log("User ने like किया");
} else {
  console.log("Like नहीं किया");
}

// Total count
const count = await db.getLikeCount("post", "p1");
console.log(`Total ${count} likes`);
```

### Comment लिखना और Reply देना
```javascript
// Main comment add करना
const commentId = generateId();
await db.addComment(
  commentId,
  "u1",           // User
  "post",         // Entity type
  "p1",           // Post ID
  "शानदार पोस्ट!",  // Content
  null            // Parent = null (main comment है)
);

// Reply लिखना (same comment पर)
const replyId = generateId();
await db.addComment(
  replyId,
  "u2",
  "post",
  "p1",
  "धन्यवाद!",
  commentId       // Parent ID डालना ताकि nested हो
);

// सभी comments देखना
const comments = await db.getComments("post", "p1", 50, 0);

// एक comment के replies देखना
const replies = await db.getCommentReplies(commentId, 20, 0);
```

### Post Share करना
```javascript
// DM में share करना
const shareId = generateId();
await db.addShare(
  shareId,
  "u1",           // किसने share किया
  "post",         // क्या
  "p1",           // कौन सा post
  "dm",           // कहाँ share किया
  "u2"            // किसको share किया
);

// Story में share करना
const shareId2 = generateId();
await db.addShare(
  shareId2,
  "u1",
  "post",
  "p1",
  "story",        // Story में जोड़ा गया
  null            // यहाँ किसी specific user को नहीं, सब देख सकते हैं
);
```

---

## 🔑 Important Keys (याद रखने वाली बातें)

| बात | विवरण |
|-----|--------|
| **entity_type** | "post", "reel", "comment", आदि |
| **entity_id** | Post/Reel/Comment की ID |
| **user_id** | User की ID |
| **soft delete** | Comments delete नहीं होते, बस `is_deleted=1` हो जाता है |
| **UNIQUE constraint** | एक user एक entity को एक बार ही like कर सकता है |
| **Indexes** | Entity, User, Type पर indexes हैं ताकि query fast हो |

---

## ✅ Verification करना

Tables create हुए या नहीं यह check करने के लिए:

```bash
# Wrangler से check करें
wrangler d1 execute socialapkdatabase --command "SELECT name FROM sqlite_master WHERE type='table';"
```

Output में ये तीनों होने चाहिए:
- `likes`
- `comments`
- `shares`

---

## 📝 Files बनाई गई हैं:

1. **`scripts/add-engagement-tables.js`** - Migration script (SQL)
2. **`ENGAGEMENT_TABLES_GUIDE.md`** - Complete English documentation
3. **Updated `src/database/db.js`** - Database methods added
4. **Updated `src/index.js`** - API endpoints added

---

## 🎯 अगला Step

```bash
# Deploy करने से पहले local में test करें
wrangler deploy

# Database में tables create करें
wrangler d1 execute socialapkdatabase --file ./scripts/add-engagement-tables.js

# Check करें कि सब काम कर रहा है
curl "http://localhost:8787/api/likes/count?entity_type=post&entity_id=test"
```

---

**अब आपका Database पूरी तरह Ready है! 🚀**

Kोई सवाल हो तो पूछें!
