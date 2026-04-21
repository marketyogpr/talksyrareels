# 📋 COMPLETE BACKEND SUMMARY FOR APK INTEGRATION
## Detailed Technical Documentation for Gemini AI & APK Development

---

## 📌 PROJECT OVERVIEW

**Project Name:** ShortsTalkSyra (Social Media Short Video App)  
**Backend:** Cloudflare Workers (Serverless)  
**Database:** D1 (SQLite on Cloudflare)  
**Storage:** R2 (Object Storage on Cloudflare)  
**Main File:** `/src/index.js`

---

## 🔧 INFRASTRUCTURE SETUP

### Cloudflare Configuration (`wrangler.toml`)
```toml
name = "shortstalks-backend"
main = "src/index.js"
compatibility_date = "2024-01-01"

account_id = "3ff2b455ebd33a9dfc733d1db3afa8f1"

# D1 Database Binding
[[d1_databases]]
binding = "DB"
database_name = "socialapkdatabase"
database_id = "e5c60c09-bbc6-474f-a8f5-e6f279474b41"

# R2 Bucket Binding
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "socialapkvideos"
```

### CORS Headers (Available on all endpoints)
```javascript
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
}
```

---

## 📊 DATABASE SCHEMA

### TABLE 1: `users`
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    fullName TEXT,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    birthDate TEXT,
    profilePic TEXT,
    bio TEXT,
    isVerified INTEGER DEFAULT 0,
    followerCount INTEGER DEFAULT 0,
    followingCount INTEGER DEFAULT 0,
    postCount INTEGER DEFAULT 0,
    website TEXT,
    location TEXT,
    joinDate TEXT NOT NULL,
    lastLogin TEXT,
    status TEXT DEFAULT 'active',
    isBlocked INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT
);
```

### TABLE 2: `posts` ⭐ (MAIN TABLE)
```sql
CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    postId TEXT UNIQUE NOT NULL,
    userId TEXT NOT NULL,
    username TEXT,
    userImage TEXT,
    isVerified INTEGER DEFAULT 0,
    type TEXT NOT NULL,           -- 'post', 'reel', 'story'
    content TEXT,                 -- Caption/text
    mediaUrl TEXT,                -- R2 URL
    thumbnailUrl TEXT,            -- Preview image
    metadata TEXT,                -- JSON string
    tags TEXT,                    -- Comma-separated
    language TEXT DEFAULT 'en',
    likeCount INTEGER DEFAULT 0,
    commentCount INTEGER DEFAULT 0,
    repostCount INTEGER DEFAULT 0,
    viewsCount INTEGER DEFAULT 0,
    saveCount INTEGER DEFAULT 0,
    clickCount INTEGER DEFAULT 0,
    locationName TEXT,
    lat REAL,
    lng REAL,
    aspectRatio REAL DEFAULT 1.0,
    duration REAL DEFAULT 0,      -- Video duration
    fileSize INTEGER,
    status TEXT DEFAULT 'active',
    isNsfw INTEGER DEFAULT 0,
    allowComments INTEGER DEFAULT 1,
    visibility TEXT DEFAULT 'public',
    isPromoted INTEGER DEFAULT 0,
    adLink TEXT,
    coinReward INTEGER DEFAULT 0,
    timestamp TEXT NOT NULL,
    updatedAt TEXT,
    FOREIGN KEY (userId) REFERENCES users(userId)
);
```

### TABLE 3: `comments`
```sql
CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commentId TEXT UNIQUE NOT NULL,
    postId TEXT NOT NULL,
    userId TEXT NOT NULL,
    username TEXT,
    userImage TEXT,
    content TEXT NOT NULL,
    likeCount INTEGER DEFAULT 0,
    replyCount INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    isNsfw INTEGER DEFAULT 0,
    timestamp TEXT NOT NULL,
    updatedAt TEXT,
    FOREIGN KEY (postId) REFERENCES posts(postId),
    FOREIGN KEY (userId) REFERENCES users(userId)
);
```

### TABLE 4: `likes`
```sql
CREATE TABLE likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    likeId TEXT UNIQUE NOT NULL,
    userId TEXT NOT NULL,
    postId TEXT,
    commentId TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(userId),
    FOREIGN KEY (postId) REFERENCES posts(postId),
    FOREIGN KEY (commentId) REFERENCES comments(commentId),
    UNIQUE(userId, postId, commentId)
);
```

### TABLE 5: `reposts`
```sql
CREATE TABLE reposts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repostId TEXT UNIQUE NOT NULL,
    userId TEXT NOT NULL,
    originalPostId TEXT NOT NULL,
    originalUserId TEXT NOT NULL,
    caption TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(userId),
    FOREIGN KEY (originalPostId) REFERENCES posts(postId),
    UNIQUE(userId, originalPostId)
);
```

### TABLE 6: `follows`
```sql
CREATE TABLE follows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    followerId TEXT NOT NULL,
    followingId TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (followerId) REFERENCES users(userId),
    FOREIGN KEY (followingId) REFERENCES users(userId),
    UNIQUE(followerId, followingId)
);
```

### TABLE 7: `saved_posts`
```sql
CREATE TABLE saved_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    saveId TEXT UNIQUE NOT NULL,
    userId TEXT NOT NULL,
    postId TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(userId),
    FOREIGN KEY (postId) REFERENCES posts(postId),
    UNIQUE(userId, postId)
);
```

### TABLE 8: `blocks`
```sql
CREATE TABLE blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blockerId TEXT NOT NULL,
    blockedUserId TEXT NOT NULL,
    reason TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (blockerId) REFERENCES users(userId),
    FOREIGN KEY (blockedUserId) REFERENCES users(userId),
    UNIQUE(blockerId, blockedUserId)
);
```

### TABLE 9: `hashtags`
```sql
CREATE TABLE hashtags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag TEXT UNIQUE NOT NULL,
    count INTEGER DEFAULT 1,
    trendScore REAL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT
);
```

### TABLE 10: `notifications`
```sql
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notificationId TEXT UNIQUE NOT NULL,
    userId TEXT NOT NULL,
    senderId TEXT,
    type TEXT NOT NULL,
    postId TEXT,
    content TEXT,
    isRead INTEGER DEFAULT 0,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(userId),
    FOREIGN KEY (senderId) REFERENCES users(userId),
    FOREIGN KEY (postId) REFERENCES posts(postId)
);
```

### TABLE 11: `conversations` ⭐ NEW
```sql
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,              -- "private" or "group"
    name TEXT,                       -- Group name
    image TEXT,                      -- Group image URL
    last_message_id TEXT,
    last_message_text TEXT,
    last_message_time TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(userId)
);
```

### TABLE 12: `messages` ⭐ NEW
```sql
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    type TEXT NOT NULL,              -- "text", "image", "video", "audio"
    content TEXT,
    media_url TEXT,
    thumbnail_url TEXT,
    parent_id TEXT,                  -- For replies/threads
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (sender_id) REFERENCES users(userId)
);
```

### TABLE 13: `conversation_members` ⭐ NEW
```sql
CREATE TABLE conversation_members (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',      -- "member", "admin", "moderator"
    joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
    left_at TEXT,                    -- NULL if still in conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (user_id) REFERENCES users(userId)
);
```

### TABLE 14: `message_reads` ⭐ NEW
```sql
CREATE TABLE message_reads (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'delivered',  -- "delivered", "seen"
    seen_at TEXT,
    FOREIGN KEY (message_id) REFERENCES messages(id),
    FOREIGN KEY (user_id) REFERENCES users(userId)
);
```

### TABLE 15: `calls` ⭐ NEW
```sql
CREATE TABLE calls (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,             -- NULL for direct calls
    caller_id TEXT NOT NULL,
    call_type TEXT,                   -- "voice" or "video"
    call_status TEXT,                 -- "ringing", "answered", "ended", "missed"
    started_at TEXT,
    answered_at TEXT,
    ended_at TEXT,
    duration INTEGER,                 -- In seconds
    room_id TEXT,
    session_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (caller_id) REFERENCES users(userId)
);
```

### TABLE 16: `call_participants` ⭐ NEW
```sql
CREATE TABLE call_participants (
    id TEXT PRIMARY KEY,
    call_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    join_time TEXT,
    leave_time TEXT,
    role TEXT,                        -- "caller", "participant"
    status TEXT,                      -- "active", "inactive"
    FOREIGN KEY (call_id) REFERENCES calls(id),
    FOREIGN KEY (user_id) REFERENCES users(userId)
);
```

---

## 🔌 WEBSOCKET REAL-TIME ARCHITECTURE

### Overview
TalkSyra real-time messaging aur P2P calling ke liye **WebSocket + Durable Objects** use karta hai:

```
APK (Flutter) ←→ Cloudflare Worker ←→ Durable Objects (User Sessions) ←→ D1 Database
                                                      ↓
                                              Real-time message routing
                                              WebRTC signal relaying
```

### Components

#### 1. **Durable Objects (UserSession)**
- Har user ke liye ek persistent instance
- WebSocket connections manage karta hai
- Message routing aur call signaling handle karta hai
- In-memory session state maintain karta hai

#### 2. **D1 Database**
- Chat messages ko permanently store karta hai
- Call logs maintain karta hai
- Only messages ko save karta hai, signals nahi (low latency ke liye)

#### 3. **WebSocket Protocol**
- APK aur backend ke beech real-time two-way communication
- Messages, signals dono transmit hote hain
- Automatic reconnection handle hota hai APK mein

---

### WebSocket Connection Setup

#### APK Side (Flutter)
```dart
// Connect to WebSocket
final String wsUrl = "wss://your-worker.dev/ws?userId=USER_ID";
final WebSocketChannel channel = WebSocketChannel.connect(
  Uri.parse(wsUrl),
);

// Listen for messages
channel.stream.listen((message) {
  Map data = jsonDecode(message);
  
  if (data['type'] == 'message') {
    // Handle chat message
    handleChatMessage(data);
  } else if (data['type'] == 'offer') {
    // Handle call offer (WebRTC)
    handleCallOffer(data);
  } else if (data['type'] == 'answer') {
    // Handle call answer
    handleCallAnswer(data);
  } else if (data['type'] == 'candidate') {
    // Handle ICE candidate
    handleIceCandidate(data);
  }
});
```

#### Backend Setup (Cloudflare)
```javascript
// wrangler.toml configuration
[[durable_objects.bindings]]
name = "USER_SESSION"
class_name = "UserSession"

[[migrations]]
tag = "v1"
new_classes = ["UserSession"]
```

---

### WebSocket Message Types

#### 1. CHAT MESSAGE
```json
{
  "type": "message",
  "targetId": "user456",
  "conversationId": "conv_123",
  "senderId": "user123",
  "message": {
    "type": "text",
    "content": "Hello! 👋",
    "created_at": "2024-01-01T12:30:00Z"
  }
}
```

**Backend Action:**
1. Message ko D1 database mein INSERT karo
2. Target user online hai to directly send karo
3. Target offline hai to FCM notification send karo

---

#### 2. CALL OFFER (Initiate Call)
```json
{
  "type": "offer",
  "targetId": "user456",
  "callerId": "user123",
  "callType": "video",
  "offer": {
    "type": "offer",
    "sdp": "v=0\no=- ... (WebRTC SDP)"
  }
}
```

**Backend Action:**
- Direct memory se relay (database mein nahi save)
- Target user ko immediately forward karo
- Low latency (milliseconds mein)

---

#### 3. CALL ANSWER (Accept Call)
```json
{
  "type": "answer",
  "targetId": "user123",
  "senderId": "user456",
  "answer": {
    "type": "answer",
    "sdp": "v=0\no=- ... (WebRTC SDP)"
  }
}
```

**Backend Action:**
- Directly relay to caller
- No database persistence needed

---

#### 4. ICE CANDIDATE (Network Path)
```json
{
  "type": "candidate",
  "targetId": "user456",
  "senderId": "user123",
  "candidate": {
    "candidate": "candidate:842163049 ...",
    "sdpMLineIndex": 0,
    "sdpMid": "0"
  }
}
```

**Backend Action:**
- Relay directly to target
- Fast forwarding in memory

---

### WebSocket Flow Examples

#### Chat Message Flow
```
┌─────────────┐                                      ┌─────────────┐
│   APK #1    │                                      │   APK #2    │
│  (user123)  │                                      │  (user456)  │
└──────┬──────┘                                      └──────▲──────┘
       │                                                    │
       │ WebSocket.send({type: "message"})                │
       └──────────────────────────────────────┬───────────┘
                                              │
                               ┌──────────────▼─────────────┐
                               │  Cloudflare Worker         │
                               │  ┌──────────────────────┐  │
                               │  │ UserSession (DO)     │  │
                               │  │ ┌────────────────┐   │  │
                               │  │ │ sessions Map   │   │  │
                               │  │ │ user123 → ws1  │   │  │
                               │  │ │ user456 → ws2  │   │  │
                               │  │ └────────────────┘   │  │
                               │  └──────────────────────┘  │
                               │           ▼                │
                               │  ┌──────────────────────┐  │
                               │  │ D1 Database          │  │
                               │  │ INSERT messages      │  │
                               │  │ UPDATE conversations │  │
                               │  └──────────────────────┘  │
                               └──────────────────────────┘
```

#### P2P Call Flow (WebRTC Signaling)
```
┌─────────────┐                                      ┌─────────────┐
│   APK #1    │                                      │   APK #2    │
│  (Caller)   │                                      │ (Receiver)  │
└──────┬──────┘                                      └──────▲──────┘
       │                                                    │
       │ 1. WebSocket.send({type: "offer"})               │
       └──────────────────────────────────────┬───────────┘
                                              │
                               ┌──────────────▼─────────────┐
                               │  UserSession (DO)          │
                               │  (Memory only, no DB)      │
                               │  Direct relay              │
                               └──────────────────────────┘
       │                                                    │
       │                    2. Relay offer                 │
       │ ◄──────────────────────────────────────────────── │
       │                                                    │
       │ 3. WebSocket.send({type: "answer"})              │
       │ ──────────────────────────────────────────────► │
       │                                                    │
       │           4. ICE Candidates Exchange             │
       │ ◄────────────────────────────────────────────►  │
       │                                                    │
       │ ════════════════════════════════════════════════  │
       │           P2P Connection Established             │
       │    (Media flows DIRECTLY between phones)         │
       │    (Server is NOT involved after this point)     │
       │ ════════════════════════════════════════════════  │
```

---

### Connection Lifecycle

#### 1. Connect
```
WebSocket Connection: wss://worker.dev/ws?userId=user123

✓ User connects to WebSocket
✓ Durable Object creates session for user123
✓ UserSession instance persists across requests
✓ Ready to send/receive messages
```

#### 2. Send Message
```
APK sends: {type: "message", targetId: "user456", message: {...}}

✓ Durable Object receives message
✓ INSERT into D1 database
✓ Check if user456 is online
✓ If online: WebSocket.send() to user456
✓ If offline: Trigger FCM notification
```

#### 3. Receive Message
```
Durable Object relays message to user456's WebSocket

✓ APK receives via WebSocket.stream.listen()
✓ Parse JSON
✓ Update UI (add to chat list)
✓ (Optional) Mark as read: POST /api/messages/{id}/read
```

#### 4. Disconnect
```
User closes app or connection lost

✓ WebSocket close event fires
✓ Durable Object removes user from sessions
✓ Other online users won't find this user
```

---

## 🌐 ALL ENDPOINTS (COMPLETE LIST)

### ✅ USER SYSTEM ENDPOINTS

#### 1. Register User
```
Endpoint: POST /api/user/register
Content-Type: multipart/form-data

Parameters:
- userId (TEXT, REQUIRED) - Unique user identifier
- username (TEXT, REQUIRED) - Lowercase, no spaces
- fullName (TEXT) - Full name of user
- email (TEXT) - Email address
- password (TEXT, REQUIRED) - User password
- birthDate (TEXT) - Birth date
- profilePic (FILE) - Profile picture file

Response:
{
  "status": 200,
  "message": "User Registered"
}

Database Action:
- INSERT into users table
- Save profile image to R2
- Generate default profile picture if none provided
```

#### 2. Login User
```
Endpoint: POST /api/user/login
Content-Type: multipart/form-data

Parameters:
- username (TEXT) - Username or email
- password (TEXT) - Password

Response:
{
  "userId": "user123",
  "username": "john_doe",
  "fullName": "John Doe",
  "email": "john@example.com",
  "profilePic": "https://buyviro.com/profiles/...",
  "isVerified": 0,
  "followerCount": 100,
  "followingCount": 50,
  "postCount": 25,
  "bio": "Bio text",
  "website": "https://...",
  "location": "Mumbai",
  ...all user fields
}

Database Action:
- Query users table with username/email and password
- Return complete user object if credentials match
- Return null if not found
```

#### 3. Check User Profile
```
Endpoint: GET /api/user/check?userId=user123
Method: GET

Parameters:
- userId (QUERY STRING) - User ID to fetch

Response:
{
  "userId": "user123",
  "username": "john_doe",
  "fullName": "John Doe",
  "profilePic": "https://...",
  "isVerified": 1,
  "followerCount": 100,
  "followingCount": 50,
  "postCount": 25,
  ...
}

Database Action:
- SELECT * FROM users WHERE userId = ?
```

#### 4. Update User Profile
```
Endpoint: POST /api/user/update
Content-Type: multipart/form-data

Parameters:
- userId (TEXT, REQUIRED)
- username (TEXT)
- fullName (TEXT)
- bio (TEXT)
- location (TEXT)
- website (TEXT)
- birthDate (TEXT)
- profilePic (FILE) - New profile picture
- coverPic (FILE) - Cover photo

Response:
{
  "status": 200,
  "message": "Profile Updated"
}

Database Action:
- UPDATE users table with new data
- Upload images to R2 if provided
- Generate new URLs
- Update timestamp
```

#### 5. Search Users
```
Endpoint: GET /api/user/search?query=john
Method: GET

Parameters:
- query (QUERY STRING) - Search term

Response:
{
  "success": true,
  "users": [
    {
      "userId": "user123",
      "username": "john_doe",
      "fullName": "John Doe",
      "profilePic": "https://...",
      "isVerified": 1
    },
    ...
  ]
}

Database Action:
- SELECT FROM users WHERE username LIKE %query% OR fullName LIKE %query%
- LIMIT 20 results
```

---

### 📹 POST SYSTEM ENDPOINTS (MAIN)

#### 1. Create Post ⭐ MOST IMPORTANT
```
Endpoint: POST /api/posts/create
Content-Type: multipart/form-data

Parameters:
REQUIRED:
- userId (TEXT) - Who posted
- username (TEXT) - Username for display
- type (TEXT) - 'post', 'reel', 'story'
- media (FILE) - Video or image file

OPTIONAL:
- userImage (TEXT) - Profile picture URL
- isVerified (INTEGER) - Verified badge (0/1)
- content (TEXT) - Caption text
- thumbnail (FILE) - Thumbnail image for video
- metadata (TEXT) - JSON string with extra data
- tags (TEXT) - Comma-separated hashtags "#viral,#trending"
- language (TEXT) - Language code (default: 'en')
- visibility (TEXT) - 'public', 'private', 'friends' (default: 'public')
- allowComments (INTEGER) - 1/0 (default: 1)
- isNsfw (INTEGER) - 0/1 (default: 0)
- locationName (TEXT) - Location name
- lat (FLOAT) - Latitude
- lng (FLOAT) - Longitude
- aspectRatio (FLOAT) - Video aspect ratio (default: 1.0)
- duration (FLOAT) - Video duration in seconds
- adLink (TEXT) - Advertisement link
- isPromoted (INTEGER) - Is promoted? 0/1
- coinReward (INTEGER) - Coin reward amount

Response:
{
  "success": true,
  "postId": "user123_1713628800000_abc123",
  "mediaUrl": "https://buyviro.com/posts/user123/1713628800000_video.mp4",
  "thumbnailUrl": "https://buyviro.com/thumbnails/user123/1713628800000_thumb.jpg",
  "message": "Post created successfully"
}

Database Actions:
1. Upload media file to R2 Storage
   - Path: posts/{userId}/{timestamp}_{filename}
   - Return public URL
2. Upload thumbnail to R2
   - Path: thumbnails/{userId}/{timestamp}_thumb.jpg
3. Generate unique postId: {userId}_{timestamp}_{randomString}
4. INSERT into posts table with all data
5. UPDATE users SET postCount = postCount + 1
6. Set all counts to 0 (likeCount, commentCount, etc.)
```

#### 2. Get Feed (All Posts)
```
Endpoint: GET /api/posts/feed?limit=50&offset=0
Method: GET

Parameters:
- limit (INTEGER) - Number of posts (default: 50)
- offset (INTEGER) - Pagination offset (default: 0)

Response:
{
  "success": true,
  "posts": [
    {
      "postId": "user123_1713628800000_abc123",
      "userId": "user123",
      "username": "john_doe",
      "userImage": "https://...",
      "type": "reel",
      "content": "Check this out! 🔥",
      "mediaUrl": "https://buyviro.com/posts/user123/video.mp4",
      "thumbnailUrl": "https://...",
      "likeCount": 150,
      "commentCount": 25,
      "repostCount": 10,
      "viewsCount": 1000,
      "saveCount": 5,
      "tags": "#viral,#trending",
      "visibility": "public",
      "status": "active",
      "timestamp": "2024-01-01T12:30:00Z",
      ...all other columns
    },
    ...more posts
  ]
}

Database Action:
- SELECT * FROM posts 
- WHERE status = 'active' AND visibility = 'public'
- ORDER BY timestamp DESC
- LIMIT ? OFFSET ?
```

#### 3. Get User's Posts
```
Endpoint: GET /api/posts/user/{userId}
Method: GET

Example: GET /api/posts/user/user123

Parameters:
- userId (PATH PARAMETER) - User ID

Response:
{
  "success": true,
  "posts": [
    {...post objects...}
  ]
}

Database Action:
- SELECT * FROM posts WHERE userId = ? AND status = 'active'
- ORDER BY timestamp DESC
- LIMIT 100
```

#### 4. Get Single Post Detail
```
Endpoint: GET /api/posts/detail/{postId}
Method: GET

Example: GET /api/posts/detail/user123_1713628800000_abc123

Parameters:
- postId (PATH PARAMETER) - Post ID

Response:
{
  "success": true,
  "post": {
    "postId": "user123_1713628800000_abc123",
    ...all post fields...
  }
}

Error Response (if not found):
{
  "success": false,
  "message": "Post not found"
}

Database Action:
- SELECT * FROM posts WHERE postId = ?
```

#### 5. Update Post
```
Endpoint: POST /api/posts/update
Content-Type: multipart/form-data

Parameters:
- postId (TEXT, REQUIRED)
- content (TEXT) - New caption
- tags (TEXT) - New tags
- metadata (TEXT) - New metadata
- visibility (TEXT) - Privacy setting
- isNsfw (INTEGER) - NSFW flag

Response:
{
  "success": true,
  "message": "Post updated successfully"
}

Database Action:
- UPDATE posts SET 
  - content = ?
  - tags = ?
  - metadata = ?
  - visibility = ?
  - isNsfw = ?
  - updatedAt = current_timestamp
- WHERE postId = ?
```

#### 6. Delete Post
```
Endpoint: POST /api/posts/delete
Content-Type: multipart/form-data

Parameters:
- postId (TEXT, REQUIRED) - Post to delete
- userId (TEXT, REQUIRED) - For verification (only owner can delete)

Response:
{
  "success": true,
  "message": "Post deleted successfully"
}

Error Response (if not owner):
{
  "success": false,
  "message": "Unauthorized"
}

Database Actions:
1. SELECT * FROM posts WHERE postId = ?
2. Verify userId matches
3. UPDATE posts SET status = 'deleted' WHERE postId = ?
4. UPDATE users SET postCount = postCount - 1 WHERE userId = ?
```

#### 7. Increment View Count
```
Endpoint: POST /api/posts/view
Content-Type: multipart/form-data

Parameters:
- postId (TEXT, REQUIRED)

Response:
{
  "success": true,
  "message": "View counted"
}

Database Action:
- UPDATE posts SET viewsCount = viewsCount + 1 WHERE postId = ?
```

#### 8. Increment Click Count
```
Endpoint: POST /api/posts/click
Content-Type: multipart/form-data

Parameters:
- postId (TEXT, REQUIRED)

Response:
{
  "success": true,
  "message": "Click counted"
}

Database Action:
- UPDATE posts SET clickCount = clickCount + 1 WHERE postId = ?
```

---

### ❤️ SOCIAL SYSTEM ENDPOINTS

#### 1. Like Post
```
Endpoint: POST /api/social/like
Content-Type: multipart/form-data

Parameters:
- userId (TEXT, REQUIRED) - Who's liking
- postId (TEXT, REQUIRED) - Which post

Response:
{
  "success": true,
  "message": "Post liked"
}

Error (already liked):
{
  "success": false,
  "message": "Already liked"
}

Database Actions:
1. Check if already liked: SELECT FROM likes WHERE userId = ? AND postId = ?
2. If exists: return error
3. If not: INSERT into likes with unique likeId
4. UPDATE posts SET likeCount = likeCount + 1 WHERE postId = ?
```

#### 2. Unlike Post
```
Endpoint: POST /api/social/unlike
Content-Type: multipart/form-data

Parameters:
- userId (TEXT, REQUIRED)
- postId (TEXT, REQUIRED)

Response:
{
  "success": true,
  "message": "Like removed"
}

Database Actions:
1. DELETE FROM likes WHERE userId = ? AND postId = ?
2. UPDATE posts SET likeCount = likeCount - 1 WHERE postId = ?
```

#### 3. Save Post
```
Endpoint: POST /api/social/save
Content-Type: multipart/form-data

Parameters:
- userId (TEXT, REQUIRED)
- postId (TEXT, REQUIRED)

Response:
{
  "success": true,
  "message": "Post saved"
}

Database Actions:
1. INSERT into saved_posts with unique saveId
2. UPDATE posts SET saveCount = saveCount + 1 WHERE postId = ?
```

#### 4. Unsave Post
```
Endpoint: POST /api/social/unsave
Content-Type: multipart/form-data

Parameters:
- userId (TEXT, REQUIRED)
- postId (TEXT, REQUIRED)

Response:
{
  "success": true,
  "message": "Post unsaved"
}

Database Actions:
1. DELETE FROM saved_posts WHERE userId = ? AND postId = ?
2. UPDATE posts SET saveCount = saveCount - 1 WHERE postId = ?
```

#### 5. Add Comment
```
Endpoint: POST /api/social/comment
Content-Type: application/json

Body:
{
  "postId": "user123_1713628800000_abc123",
  "userId": "user456",
  "username": "commenter_user",
  "userImage": "https://...",
  "content": "Great post! 👍",
  "isNsfw": 0
}

Response:
{
  "success": true,
  "commentId": "comment_user456_user123_1713628800000_...",
  "message": "Comment added"
}

Database Actions:
1. Generate unique commentId
2. INSERT into comments table
3. UPDATE posts SET commentCount = commentCount + 1 WHERE postId = ?
```

#### 6. Get Post Comments
```
Endpoint: GET /api/comments/post/{postId}
Method: GET

Example: GET /api/comments/post/user123_1713628800000_abc123

Response:
{
  "success": true,
  "comments": [
    {
      "commentId": "comment_user456_...",
      "postId": "user123_1713628800000_abc123",
      "userId": "user456",
      "username": "commenter_user",
      "userImage": "https://...",
      "content": "Great post! 👍",
      "likeCount": 5,
      "status": "active",
      "timestamp": "2024-01-01T13:00:00Z"
    },
    ...more comments
  ]
}

Database Action:
- SELECT * FROM comments 
- WHERE postId = ? AND status = 'active'
- ORDER BY timestamp DESC
```

#### 7. Repost/Share
```
Endpoint: POST /api/social/repost
Content-Type: multipart/form-data

Parameters:
- userId (TEXT, REQUIRED) - Who's reposting
- postId (TEXT, REQUIRED) - Original post ID
- caption (TEXT) - Optional caption on repost

Response:
{
  "success": true,
  "repostId": "repost_user456_user123_...",
  "message": "Post reposted"
}

Database Actions:
1. Get original post: SELECT FROM posts WHERE postId = ?
2. If not found: return error
3. Generate unique repostId
4. INSERT into reposts table
5. UPDATE posts SET repostCount = repostCount + 1
```

#### 8. Follow User
```
Endpoint: POST /api/social/follow
Content-Type: multipart/form-data

Parameters:
- followerId (TEXT, REQUIRED) - Who's following
- followingId (TEXT, REQUIRED) - Who to follow

Response:
{
  "success": true,
  "message": "User followed"
}

Database Actions:
1. Check if already following: SELECT FROM follows WHERE followerId = ? AND followingId = ?
2. If exists: return error
3. INSERT into follows table
4. UPDATE users SET followingCount = followingCount + 1 WHERE userId = followerId
5. UPDATE users SET followerCount = followerCount + 1 WHERE userId = followingId
```

#### 9. Unfollow User
```
Endpoint: POST /api/social/unfollow
Content-Type: multipart/form-data

Parameters:
- followerId (TEXT, REQUIRED)
- followingId (TEXT, REQUIRED)

Response:
{
  "success": true,
  "message": "User unfollowed"
}

Database Actions:
1. DELETE FROM follows WHERE followerId = ? AND followingId = ?
2. UPDATE users SET followingCount = followingCount - 1 WHERE userId = followerId
3. UPDATE users SET followerCount = followerCount - 1 WHERE userId = followingId
```

#### 10. Messaging System - Conversations, Messages & Calls
```
Database Tables:
- conversations: Group/private chats store
- messages: Individual messages
- conversation_members: Who is in which conversation
- message_reads: Message read receipts
- calls: Voice/video call records
- call_participants: Who participated in calls
```

##### 10.1 CONVERSATIONS ENDPOINTS

**CREATE CONVERSATION**
```
POST /api/conversations/create
Content-Type: application/json

Request Body:
{
  "type": "private",           // "private" or "group"
  "name": "Friends Group",     // For groups only
  "image": "group_pic_url",    // For groups
  "createdBy": "user123"
}

Response:
{
  "id": "conv_1713628800000",
  "success": true
}

Database Action:
- INSERT into conversations table
- INSERT creator as 'admin' member
```

**GET USER CONVERSATIONS**
```
GET /api/conversations?userId=user123

Response:
[
  {
    "id": "conv_1713628800000",
    "type": "group",
    "name": "Friends Group",
    "image": "url...",
    "last_message_text": "See you soon! 👋",
    "last_message_time": "2024-01-01T12:30:00Z",
    "created_at": "2024-01-01T10:00:00Z"
  },
  ...
]

Database Action:
- SELECT * FROM conversations JOIN conversation_members WHERE user_id = ? AND left_at IS NULL
```

**GET CONVERSATION DETAILS**
```
GET /api/conversations/conv_1713628800000

Response:
{
  "id": "conv_1713628800000",
  "type": "group",
  "name": "Friends Group",
  "image": "url...",
  "last_message_id": "msg_123",
  "created_by": "user123",
  "created_at": "2024-01-01T10:00:00Z"
}
```

**UPDATE CONVERSATION**
```
PUT /api/conversations/conv_1713628800000/update
Content-Type: application/json

Request Body:
{
  "name": "New Group Name",
  "image": "new_image_url",
  "lastMessageId": "msg_456",
  "lastMessageText": "Latest message"
}

Response:
{ "success": true }
```

**DELETE CONVERSATION**
```
DELETE /api/conversations/conv_1713628800000/delete

Response:
{ "success": true }

Database Action:
- DELETE FROM conversations WHERE id = ?
```

##### 10.2 MESSAGES ENDPOINTS

**SEND MESSAGE**
```
POST /api/messages/send
Content-Type: application/json

Request Body:
{
  "conversationId": "conv_1713628800000",
  "senderId": "user123",
  "type": "text",              // "text", "image", "video", "audio"
  "content": "Hello everyone! 👋",
  "mediaUrl": "url_to_media",  // Optional
  "thumbnailUrl": "url_to_thumb", // Optional
  "parentId": "msg_123"        // For replies/threads
}

Response:
{
  "id": "msg_1713628900000",
  "success": true
}

Database Actions:
1. INSERT into messages
2. UPDATE conversations SET last_message_id, last_message_text, updated_at
```

**GET CONVERSATION MESSAGES**
```
GET /api/messages/conv_1713628800000?limit=50&offset=0

Response:
[
  {
    "id": "msg_1713628900000",
    "conversation_id": "conv_1713628800000",
    "sender_id": "user123",
    "type": "text",
    "content": "Hello everyone! 👋",
    "media_url": null,
    "thumbnail_url": null,
    "is_deleted": 0,
    "created_at": "2024-01-01T12:30:00Z"
  },
  ...
]

Pagination:
- limit: Number of messages (default 50, max 100)
- offset: Skip messages (for scrolling)
```

**UPDATE MESSAGE**
```
PUT /api/messages/msg_1713628900000/update
Content-Type: application/json

Request Body:
{
  "content": "Updated message text"
}

Response:
{ "success": true }
```

**DELETE MESSAGE**
```
DELETE /api/messages/msg_1713628900000/delete

Response:
{ "success": true }

Database Action:
- UPDATE messages SET is_deleted = 1 (soft delete)
```

**MARK MESSAGE AS READ**
```
POST /api/messages/msg_1713628900000/read
Content-Type: application/json

Request Body:
{
  "userId": "user456"
}

Response:
{ "success": true }

Database Action:
- INSERT into message_reads with seen_at timestamp
```

**GET MESSAGE READ STATUS**
```
GET /api/messages/msg_1713628900000/reads

Response:
[
  {
    "id": "read_456",
    "message_id": "msg_1713628900000",
    "user_id": "user456",
    "status": "seen",
    "seen_at": "2024-01-01T12:35:00Z"
  },
  ...
]
```

##### 10.3 CONVERSATION MEMBERS ENDPOINTS

**ADD MEMBER**
```
POST /api/conversations/conv_1713628800000/members/add
Content-Type: application/json

Request Body:
{
  "userId": "user456",
  "role": "member"  // "member", "admin", "moderator"
}

Response:
{ "success": true }
```

**REMOVE MEMBER**
```
DELETE /api/conversations/conv_1713628800000/members/remove?userId=user456

Response:
{ "success": true }

Database Action:
- UPDATE conversation_members SET left_at = ? (soft delete)
```

**GET CONVERSATION MEMBERS**
```
GET /api/conversations/conv_1713628800000/members

Response:
[
  {
    "id": "member_123",
    "conversation_id": "conv_1713628800000",
    "user_id": "user123",
    "role": "admin",
    "joined_at": "2024-01-01T10:00:00Z",
    "left_at": null
  },
  {
    "id": "member_124",
    "conversation_id": "conv_1713628800000",
    "user_id": "user456",
    "role": "member",
    "joined_at": "2024-01-01T10:15:00Z",
    "left_at": null
  }
]
```

##### 10.4 CALLING SYSTEM ENDPOINTS

**START CALL**
```
POST /api/calls/start
Content-Type: application/json

Request Body:
{
  "conversationId": "conv_1713628800000",  // Optional
  "callerId": "user123",
  "callType": "voice",  // "voice" or "video"
  "roomId": "room_abc123",
  "sessionId": "session_xyz789"
}

Response:
{
  "id": "call_1713628900000",
  "success": true
}

Database Actions:
1. INSERT into calls (status = 'ringing')
2. INSERT caller into call_participants
```

**GET CALL DETAILS**
```
GET /api/calls/call_1713628900000

Response:
{
  "id": "call_1713628900000",
  "conversation_id": "conv_1713628800000",
  "caller_id": "user123",
  "call_type": "voice",
  "call_status": "ringing",     // "ringing", "answered", "ended", "missed"
  "started_at": "2024-01-01T12:30:00Z",
  "answered_at": "2024-01-01T12:30:05Z",
  "ended_at": null,
  "duration": null,
  "room_id": "room_abc123",
  "session_id": "session_xyz789"
}
```

**UPDATE CALL STATUS**
```
PUT /api/calls/call_1713628900000/update
Content-Type: application/json

Request Body:
{
  "status": "answered",      // "ringing", "answered", "ended"
  "answeredAt": "2024-01-01T12:30:05Z",
  "endedAt": null,
  "duration": null
}

Response:
{ "success": true }
```

**END CALL**
```
POST /api/calls/call_1713628900000/end
Content-Type: application/json

Request Body:
{
  "duration": 240  // Call duration in seconds
}

Response:
{ "success": true }

Database Action:
- UPDATE calls SET call_status = 'ended', ended_at = ?, duration = ?
```

##### 10.5 CALL PARTICIPANTS ENDPOINTS

**JOIN CALL**
```
POST /api/calls/call_1713628900000/participants/join
Content-Type: application/json

Request Body:
{
  "userId": "user456"
}

Response:
{ "success": true }

Database Action:
- INSERT into call_participants (role = 'participant', status = 'active')
```

**LEAVE CALL**
```
DELETE /api/calls/call_1713628900000/participants/leave?userId=user456

Response:
{ "success": true }

Database Action:
- UPDATE call_participants SET leave_time = ?, status = 'inactive'
```

**GET CALL PARTICIPANTS**
```
GET /api/calls/call_1713628900000/participants

Response:
[
  {
    "id": "part_123",
    "call_id": "call_1713628900000",
    "user_id": "user123",
    "join_time": "2024-01-01T12:30:00Z",
    "leave_time": "2024-01-01T12:34:00Z",
    "role": "caller",
    "status": "inactive"
  },
  {
    "id": "part_124",
    "call_id": "call_1713628900000",
    "user_id": "user456",
    "join_time": "2024-01-01T12:30:05Z",
    "leave_time": null,
    "role": "participant",
    "status": "active"
  }
]
```

---

## 🔄 DATA FLOW EXAMPLES

### EXAMPLE 1: User Creates a Video Post

```
Step 1: APK sends request
POST /api/posts/create
├─ userId: "user123"
├─ username: "john_doe"
├─ type: "reel"
├─ content: "Amazing video! 🔥"
├─ tags: "#viral,#trending"
├─ media: <video_file.mp4>
├─ thumbnail: <thumb.jpg>
├─ location: "Mumbai"
└─ visibility: "public"

Step 2: Backend processes
├─ Upload video to R2
│  └─ Path: posts/user123/1713628800000_video.mp4
│  └─ Return: https://buyviro.com/posts/user123/1713628800000_video.mp4
├─ Upload thumbnail to R2
│  └─ Path: thumbnails/user123/1713628800000_thumb.jpg
│  └─ Return: https://buyviro.com/thumbnails/user123/1713628800000_thumb.jpg
└─ Save to database
   └─ INSERT into posts:
      - postId: user123_1713628800000_abc123
      - mediaUrl: https://...video.mp4
      - thumbnailUrl: https://...thumb.jpg
      - likeCount: 0
      - commentCount: 0
      - timestamp: 2024-01-01T12:30:00Z

Step 3: Update user
├─ UPDATE users SET postCount = postCount + 1

Step 4: APK receives response
{
  "success": true,
  "postId": "user123_1713628800000_abc123",
  "mediaUrl": "https://...",
  "thumbnailUrl": "https://...",
  "message": "Post created successfully"
}

Step 5: Post is LIVE! 🎉
└─ Appears in feed
└─ Can be liked, commented, saved
└─ Views can be tracked
```

### EXAMPLE 2: User Likes a Post

```
Step 1: User sees post and taps Like button
APK sends: POST /api/social/like
├─ userId: "user456"
└─ postId: "user123_1713628800000_abc123"

Step 2: Backend checks if already liked
├─ SELECT FROM likes WHERE userId = "user456" AND postId = "user123_..."
└─ If exists: return "Already liked"

Step 3: If not liked, insert like
├─ INSERT into likes:
│  - likeId: like_user456_user123_...
│  - userId: user456
│  - postId: user123_...
│  - timestamp: 2024-01-01T13:00:00Z
└─ UPDATE posts SET likeCount = likeCount + 1

Step 4: APK receives
{
  "success": true,
  "message": "Post liked"
}

Step 5: APK updates UI
└─ likeCount changes from 150 to 151
└─ Like button shows as filled
```

### EXAMPLE 3: User Comments on Post

```
Step 1: User writes comment
APK sends: POST /api/social/comment
{
  "postId": "user123_1713628800000_abc123",
  "userId": "user456",
  "username": "commenter_user",
  "userImage": "https://...",
  "content": "Awesome! 👏",
  "isNsfw": 0
}

Step 2: Backend processes
├─ Generate unique commentId: comment_user456_user123_1713628800000_xyz
├─ INSERT into comments table
└─ UPDATE posts SET commentCount = commentCount + 1

Step 3: APK receives
{
  "success": true,
  "commentId": "comment_user456_...",
  "message": "Comment added"
}

Step 4: Comments section
├─ commentCount: 25 → 26
└─ New comment appears in list
```

---

## 🛠️ FOR APK DEVELOPERS (INTEGRATION CHECKLIST)

### What APK needs to do:

1. **User Registration**
   - [ ] Create registration form
   - [ ] Collect: userId, username, email, password, fullName, birthDate
   - [ ] Upload profile picture (multipart)
   - [ ] POST to `/api/user/register`
   - [ ] Save userId locally (SharedPreferences)

2. **User Login**
   - [ ] Create login form
   - [ ] POST to `/api/user/login` with username & password
   - [ ] Receive full user object
   - [ ] Save userId, token, user data locally

3. **Create Post**
   - [ ] Create post form with:
     - [ ] Video/Image picker
     - [ ] Caption input
     - [ ] Tags input
     - [ ] Location selector (optional)
     - [ ] Privacy setting selector
   - [ ] Upload video + thumbnail (multipart)
   - [ ] POST to `/api/posts/create`
   - [ ] Get postId and mediaUrl
   - [ ] Add post to local feed

4. **Display Feed**
   - [ ] GET `/api/posts/feed` on app launch
   - [ ] Display posts with:
     - [ ] User info (name, avatar, verified badge)
     - [ ] Video/image
     - [ ] Caption and tags
     - [ ] Like count, comment count, etc.
     - [ ] Timestamps

5. **Interactions**
   - [ ] Like button → POST `/api/social/like`
   - [ ] Unlike button → POST `/api/social/unlike`
   - [ ] Save button → POST `/api/social/save`
   - [ ] Comment form → POST `/api/social/comment`
   - [ ] Follow button → POST `/api/social/follow`

6. **User Profile**
   - [ ] GET `/api/user/check?userId=xxx`
   - [ ] Display user info
   - [ ] Show user's posts: GET `/api/posts/user/xxx`
   - [ ] Update profile: POST `/api/user/update`

---

## 📱 REQUEST/RESPONSE FORMATS

### Content-Type: multipart/form-data
Used for: File uploads (media, images)
```javascript
const form = new FormData();
form.append("userId", "user123");
form.append("media", videoFile);
form.append("thumbnail", thumbnailFile);

fetch('/api/posts/create', {
  method: 'POST',
  body: form
});
```

### Content-Type: application/json
Used for: Simple data (comments, messages)
```javascript
fetch('/api/social/comment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    postId: "...",
    userId: "...",
    content: "..."
  })
});
```

### GET Requests
Used for: Fetching data
```javascript
fetch('/api/posts/feed?limit=50&offset=0');
fetch('/api/user/check?userId=user123');
fetch('/api/posts/user/user123');
fetch('/api/comments/post/postId123');
```

---

## 🔑 KEY IMPLEMENTATION DETAILS

### Auto-Generated IDs
- **postId**: `{userId}_{timestamp}_{random7chars}`
  - Example: `user123_1713628800000_abc1234`
- **commentId**: `comment_{userId}_{postId}_{timestamp}`
- **likeId**: `like_{userId}_{postId}_{timestamp}`
- **repostId**: `repost_{userId}_{postId}_{timestamp}`
- **saveId**: `save_{userId}_{postId}_{timestamp}`

### File Paths in R2
- **Posts**: `posts/{userId}/{timestamp}_{filename}`
- **Thumbnails**: `thumbnails/{userId}/{timestamp}_thumb.jpg`
- **Profiles**: `profiles/{userId}_{timestamp}.jpg`
- **Covers**: `covers/{userId}_c_{timestamp}.jpg`

### URL Generation
```javascript
Public URL = https://buyviro.com/{r2_path}
Example: https://buyviro.com/posts/user123/1713628800000_video.mp4
```

### Timestamps
All timestamps in ISO 8601 format:
```
2024-01-01T12:30:00Z
```

### Database Queries Structure
- All IDs are unique (prevent duplicates)
- Foreign keys ensure data integrity
- Indexes on frequently queried columns
- Status field ('active', 'deleted') for soft deletes
- updatedAt field for tracking changes

---

## ✅ VALIDATION & ERROR HANDLING

### Common Errors:

```javascript
// 400 - Already Liked/Followed
{
  "success": false,
  "message": "Already liked"
}

// 401 - Invalid Credentials
{
  "success": false,
  "message": "Invalid Credentials"
}

// 403 - Unauthorized (can't delete others' posts)
{
  "success": false,
  "message": "Unauthorized"
}

// 404 - Not Found
{
  "success": false,
  "message": "Post not found"
}

// 500 - Server Error
{
  "status": 500,
  "message": "Database Error: ..."
}
```

### APK should handle:
1. Network errors (no internet)
2. Timeout errors (request takes too long)
3. 4xx errors (bad request)
4. 5xx errors (server issues)
5. Parse errors (invalid JSON response)

---

## 🚀 DEPLOYMENT

### Deploy to Cloudflare:
```bash
npm run deploy
```

### Environment Variables:
Already configured in wrangler.toml:
- DB binding: `env.DB`
- R2 bucket: `env.BUCKET`
- Public URL: `env.R2_PUBLIC_URL || https://buyviro.com`

---

## 📋 SUMMARY TABLE

| Feature | Endpoint | Method | What Happens |
|---------|----------|--------|--------------|
| **Register** | `/api/user/register` | POST | New user created |
| **Login** | `/api/user/login` | POST | User data returned |
| **Create Post** | `/api/posts/create` | POST | Post saved + files uploaded |
| **Get Feed** | `/api/posts/feed` | GET | 50 posts returned |
| **Like** | `/api/social/like` | POST | Like count +1 |
| **Comment** | `/api/social/comment` | POST | Comment saved, count +1 |
| **Save** | `/api/social/save` | POST | Post bookmarked |
| **Follow** | `/api/social/follow` | POST | Follow relationship created |

---

## 📱 APK FLUTTER INTEGRATION GUIDE (Real-time Messaging)

### Step 1: Add WebSocket Package
```yaml
# pubspec.yaml
dependencies:
  web_socket_channel: ^2.4.0
  json_serializable: ^6.7.0
```

### Step 2: Initialize WebSocket Connection
```dart
import 'package:web_socket_channel/web_socket_channel.dart';
import 'dart:convert';

class ChatService {
  late WebSocketChannel _channel;
  final String userId;
  final String baseUrl = "wss://talksyrareels-production.your-domain.workers.dev";
  
  ChatService({required this.userId});
  
  // Connect to WebSocket
  void connect() {
    final wsUrl = "$baseUrl/ws?userId=$userId";
    
    try {
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));
      
      // Listen for incoming messages
      _channel.stream.listen(
        (message) {
          _handleIncomingMessage(message);
        },
        onError: (error) {
          print("WebSocket Error: $error");
          // Reconnect after delay
          Future.delayed(Duration(seconds: 3), connect);
        },
        onDone: () {
          print("WebSocket closed");
          // Reconnect
          Future.delayed(Duration(seconds: 3), connect);
        },
      );
    } catch (e) {
      print("Connection failed: $e");
    }
  }
  
  // Handle incoming messages
  void _handleIncomingMessage(dynamic message) {
    try {
      final data = jsonDecode(message);
      
      switch(data['type']) {
        case 'message':
          _handleChatMessage(data);
          break;
        case 'offer':
          _handleCallOffer(data);
          break;
        case 'answer':
          _handleCallAnswer(data);
          break;
        case 'candidate':
          _handleIceCandidate(data);
          break;
      }
    } catch (e) {
      print("Message parse error: $e");
    }
  }
  
  // Send chat message
  void sendMessage({
    required String conversationId,
    required String senderId,
    required String content,
    String type = "text",
    String? mediaUrl,
  }) {
    final message = {
      "type": "message",
      "targetId": "recipient_user_id", // Get from conversation
      "conversationId": conversationId,
      "senderId": senderId,
      "message": {
        "type": type,
        "content": content,
        "mediaUrl": mediaUrl,
        "created_at": DateTime.now().toIso8601String(),
      }
    };
    
    _channel.sink.add(jsonEncode(message));
  }
  
  // Handle incoming chat message
  void _handleChatMessage(Map<String, dynamic> data) {
    final conversationId = data['conversationId'];
    final senderId = data['senderId'];
    final message = data['message'];
    
    // Update UI
    // Update chat list
    // Save to local database
    
    // Mark as read
    markMessageAsRead(data['messageId'], senderId);
  }
  
  // Mark message as read (HTTP REST API)
  Future<void> markMessageAsRead(String messageId, String userId) async {
    try {
      await http.post(
        Uri.parse("https://talksyrareels-production.your-domain.workers.dev/api/messages/$messageId/read"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"userId": userId}),
      );
    } catch (e) {
      print("Mark read error: $e");
    }
  }
  
  // Send WebRTC offer (initiate call)
  void sendCallOffer({
    required String targetId,
    required String callerId,
    required String callType, // "video" or "voice"
    required dynamic sdp, // WebRTC SDP object
  }) {
    final offer = {
      "type": "offer",
      "targetId": targetId,
      "callerId": callerId,
      "callType": callType,
      "offer": {
        "type": "offer",
        "sdp": sdp,
      }
    };
    
    _channel.sink.add(jsonEncode(offer));
  }
  
  // Handle incoming call offer
  void _handleCallOffer(Map<String, dynamic> data) {
    final callerId = data['senderId'];
    final offer = data['offer'];
    final callType = data['callType'];
    
    // Show incoming call UI
    // User can accept/reject
  }
  
  // Send call answer
  void sendCallAnswer({
    required String targetId,
    required String senderId,
    required dynamic sdp, // WebRTC SDP object
  }) {
    final answer = {
      "type": "answer",
      "targetId": targetId,
      "senderId": senderId,
      "answer": {
        "type": "answer",
        "sdp": sdp,
      }
    };
    
    _channel.sink.add(jsonEncode(answer));
  }
  
  // Handle incoming call answer
  void _handleCallAnswer(Map<String, dynamic> data) {
    final answer = data['answer'];
    
    // Update WebRTC peer connection
    // Complete handshake
  }
  
  // Send ICE candidate
  void sendIceCandidate({
    required String targetId,
    required String senderId,
    required dynamic candidate, // ICE candidate object
  }) {
    final candidateMsg = {
      "type": "candidate",
      "targetId": targetId,
      "senderId": senderId,
      "candidate": candidate,
    };
    
    _channel.sink.add(jsonEncode(candidateMsg));
  }
  
  // Handle incoming ICE candidate
  void _handleIceCandidate(Map<String, dynamic> data) {
    final candidate = data['candidate'];
    
    // Add ICE candidate to WebRTC peer connection
  }
  
  // Disconnect
  void disconnect() {
    _channel.sink.close();
  }
}
```

### Step 3: Use in Your App
```dart
class ChatScreen extends StatefulWidget {
  final String userId;
  final String conversationId;
  
  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  late ChatService _chatService;
  final TextEditingController _messageController = TextEditingController();
  
  @override
  void initState() {
    super.initState();
    _chatService = ChatService(userId: widget.userId);
    _chatService.connect(); // Connect to WebSocket
  }
  
  @override
  void dispose() {
    _chatService.disconnect();
    _messageController.dispose();
    super.dispose();
  }
  
  void _sendMessage() {
    if (_messageController.text.isNotEmpty) {
      _chatService.sendMessage(
        conversationId: widget.conversationId,
        senderId: widget.userId,
        content: _messageController.text,
      );
      
      _messageController.clear();
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("Chat")),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              // Build chat messages
            ),
          ),
          Padding(
            padding: EdgeInsets.all(8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: InputDecoration(
                      hintText: "Type a message...",
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _sendMessage,
                  child: Text("Send"),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
```

### Step 4: WebRTC Setup (for Calls)
```dart
import 'package:flutter_webrtc/flutter_webrtc.dart';

class CallService {
  late RTCPeerConnection _peerConnection;
  late ChatService _chatService;
  
  Future<void> initializeCall(String callerId, String receiverId, String callType) async {
    // Create peer connection
    _peerConnection = await createPeerConnection({
      'iceServers': [
        {'urls': ['stun:stun.l.google.com:19302']}
      ]
    });
    
    // Handle ICE candidates
    _peerConnection.onIceCandidate = (RTCIceCandidate candidate) {
      _chatService.sendIceCandidate(
        targetId: receiverId,
        senderId: callerId,
        candidate: candidate.toMap(),
      );
    };
    
    // Get local stream
    final mediaStream = await navigator.mediaDevices.getUserMedia({
      'video': callType == "video",
      'audio': true,
    });
    
    // Add tracks to peer connection
    mediaStream.getTracks().forEach((track) {
      _peerConnection.addTrack(track, mediaStream);
    });
    
    // Create offer
    final offer = await _peerConnection.createOffer();
    await _peerConnection.setLocalDescription(offer);
    
    // Send offer via WebSocket
    _chatService.sendCallOffer(
      targetId: receiverId,
      callerId: callerId,
      callType: callType,
      sdp: offer.toMap(),
    );
  }
}
```

---

**This document contains everything needed to integrate APK with the backend! ✅**
