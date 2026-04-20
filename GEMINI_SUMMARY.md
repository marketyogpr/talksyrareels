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

#### 10. Chat/Message
```
Endpoint: POST /api/chat/send
Content-Type: application/json

Body:
{
  "senderId": "user123",
  "receiverId": "user456",
  "text": "Hello! 👋"
}

Response:
{
  "success": true,
  "message": "Message sent"
}

Database Action:
- INSERT into chats table with timestamp
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

**This document contains everything needed to integrate APK with the backend! ✅**
