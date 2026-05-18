# 🤖 GEMINI INSTRUCTIONS - TalkSyra Reels Backend

**Project:** SocialApkVideos (Cloudflare Worker)  
**Owner:** marketyogpr  
**Repository:** talksyrareels  
**Last Updated:** May 18, 2026

---

## 📌 Project Overview

This is a **Cloudflare Worker** backend for Flutter APK that handles:
1. **Media Upload** - Videos, images, reels to R2 storage
2. **Real-time Communication** - WebSocket for messaging and WebRTC signaling
3. **User Session Management** - Online/offline tracking

---

## 🏗️ Project Structure

```
/workspaces/talksyrareels/
├── src/
│   ├── index.js                 (Main Worker entry point)
│   ├── feedAPIService.js        (Feed API service)
│   ├── feedAlgorithm.js         (Feed recommendation algorithm)
│   ├── engagementTracker.js     (User engagement tracking)
│   └── [Other services]
├── wrangler.toml                (Cloudflare Worker config)
├── package.json                 (Dependencies)
├── DEPLOYMENT.md                (Deployment instructions)
├── QUICKSTART.md                (Quick setup guide)
├── README.md                    (Project overview)
├── PROJECT_SUMMARY.md           (Detailed project summary)
└── [Guide files]                (Various guides)
```

---

## 🔑 Key Information for Gemini

### ✅ Primary Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/health` | GET | Health check | ✓ Working |
| `/register` | POST | User registration | ✓ Working |
| `/login` | POST | User login | ✓ Working |
| `/upload` | POST | Upload media to R2 | ✓ Working |
| `/post` | POST | Create text post (Thought) | ✓ Working |
| `/feed` | GET | Get personalized feed | ✓ Working |
| `/like` | POST | Like a video/reel | ✓ Working |
| `/unlike` | POST | Unlike a video/reel | ✓ Working |
| `/comment` | POST | Add comment to video | ✓ Working |
| `/conversations` | GET | Get conversation list | ✓ Working |
| `/messages` | GET | Get messages from conversation | ✓ Working |
| `/follow` | POST | Follow a user | ✓ Working |
| `/unfollow` | POST | Unfollow a user | ✓ Working |
| `/profile` | GET/PUT | Get/Update user profile | ✓ Working |
| `/search` | GET | Search videos/users/tags | ✓ Working |
| `/ws` | GET (Upgrade) | WebSocket connection | ✓ Working |

### 🎯 Core Services

1. **MediaService** - File upload handling
   - File: `src/index.js`
   - Max file size: 500MB
   - Generates unique filenames (timestamp + UUID)
   - Returns public R2 URL

2. **SocketService** - Real-time communication
   - WebSocket persistent connections
   - Message routing between users
   - WebRTC signaling (offer/answer/candidate)
   - Typing indicators
   - Online/offline status updates

3. **FeedAlgorithm** - Content recommendation
   - File: `src/feedAlgorithm.js`
   - Engagement-based feed ranking
   - User preference learning

4. **EngagementTracker** - Analytics
   - File: `src/engagementTracker.js`
   - Track user interactions
   - Feed performance metrics

---

## 🚀 Deployment Configuration

### Production
- **Domain:** https://api.buyviro.com
- **Environment:** production
- **R2 Bucket:** socialapkvideos-media
- **Public URL:** https://pub-d825be7386864d659719039d891d33de.r2.dev

### Staging
- **Domain:** https://staging-api.buyviro.com
- **Environment:** staging
- **R2 Bucket:** socialapkvideos-media-staging

### Configuration File
- **Location:** `wrangler.toml`
- Contains: Routes, R2 bindings, environment variables, worker settings

---

## � COMPLETE API DOCUMENTATION (A-Z)

### 1️⃣ HEALTH CHECK
```http
GET https://api.buyviro.com/health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-05-18T10:30:00.000Z",
  "version": "1.0.0"
}
```

---

### 2️⃣ USER REGISTRATION
```http
POST https://api.buyviro.com/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "phone": "+919876543210",
  "username": "john_doe",
  "password": "secure_password_123",
  "firstName": "John",
  "lastName": "Doe",
  "profilePicture": "https://r2-url/profile.jpg",
  "bio": "Love making reels!"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "userId": "user_12345abcde",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "user_12345abcde",
    "email": "user@example.com",
    "username": "john_doe",
    "firstName": "John",
    "lastName": "Doe",
    "profilePicture": "https://r2-url/profile.jpg",
    "bio": "Love making reels!",
    "createdAt": "2026-05-18T10:30:00.000Z",
    "followers": 0,
    "following": 0
  }
}
```

**Errors:**
- `400` - Email/username already exists
- `400` - Invalid email format
- `400` - Password too weak
- `500` - Server error

---

### 3️⃣ USER LOGIN
```http
POST https://api.buyviro.com/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password_123"
}
```

**OR**

```json
{
  "phone": "+919876543210",
  "password": "secure_password_123"
}
```

**OR**

```json
{
  "username": "john_doe",
  "password": "secure_password_123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "userId": "user_12345abcde",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "user_12345abcde",
    "email": "user@example.com",
    "username": "john_doe",
    "firstName": "John",
    "lastName": "Doe",
    "profilePicture": "https://r2-url/profile.jpg",
    "bio": "Love making reels!",
    "followers": 150,
    "following": 45,
    "lastLogin": "2026-05-18T10:30:00.000Z"
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `404` - User not found
- `500` - Server error

---

### 4️⃣ MEDIA UPLOAD (Video/Reel/Image)
```http
POST https://api.buyviro.com/upload
Content-Type: multipart/form-data
Authorization: Bearer <JWT_TOKEN>
```

**Request Form Data:**
```
file: <binary_file_data>
mediaType: "video" | "image" | "reel"
title: "My awesome reel"
description: "Check this out!"
tags: ["funny", "viral", "trend"]
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Media uploaded successfully",
  "media": {
    "mediaId": "media_98765xyz",
    "fileName": "1715418000123-abc1234.mp4",
    "url": "https://pub-d825be7386864d659719039d891d33de.r2.dev/1715418000123-abc1234.mp4",
    "publicUrl": "https://api.buyviro.com/media/1715418000123-abc1234.mp4",
    "size": 52428800,
    "mimeType": "video/mp4",
    "duration": 15,
    "mediaType": "video",
    "title": "My awesome reel",
    "description": "Check this out!",
    "tags": ["funny", "viral", "trend"],
    "uploadedBy": "user_12345abcde",
    "uploadedAt": "2026-05-18T10:30:00.000Z",
    "status": "active",
    "views": 0,
    "likes": 0,
    "comments": 0
  }
}
```

**Errors:**
- `400` - No file provided
- `400` - Invalid media type
- `401` - Unauthorized (invalid token)
- `413` - File size exceeds 500MB limit
- `500` - Upload failed

---

### 5️⃣ GET FEED
```http
GET https://api.buyviro.com/feed?userId=USER_ID&limit=20&offset=0&sort=trending
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `userId` - Current user ID (required)
- `limit` - Number of posts (default: 20, max: 100)
- `offset` - Pagination offset (default: 0)
- `sort` - Sort by: "trending" | "recent" | "popular" (default: trending)
- `filter` - Filter: "all" | "following" | "verified" (default: all)

**Response (200 OK):**
```json
{
  "success": true,
  "feed": [
    {
      "mediaId": "media_98765xyz",
      "fileName": "1715418000123-abc1234.mp4",
      "url": "https://pub-d825be7386864d659719039d891d33de.r2.dev/1715418000123-abc1234.mp4",
      "title": "My awesome reel",
      "description": "Check this out!",
      "mediaType": "video",
      "duration": 15,
      "uploadedBy": {
        "userId": "user_abc123",
        "username": "creator_name",
        "profilePicture": "https://r2-url/profile.jpg",
        "verified": true
      },
      "views": 1250,
      "likes": 342,
      "comments": 89,
      "isLiked": false,
      "isSaved": false,
      "uploadedAt": "2026-05-18T09:15:00.000Z",
      "engagement": {
        "engagementScore": 0.87,
        "interactionRate": 0.34
      }
    }
  ],
  "total": 500,
  "hasMore": true,
  "nextOffset": 20
}
```

---

### 6️⃣ LIKE VIDEO/REEL
```http
POST https://api.buyviro.com/like
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "mediaId": "media_98765xyz",
  "userId": "user_12345abcde"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Media liked successfully",
  "mediaId": "media_98765xyz",
  "likeId": "like_5678efgh",
  "likeCount": 343,
  "isLiked": true,
  "likedAt": "2026-05-18T10:30:00.000Z"
}
```

**Errors:**
- `400` - Media not found
- `400` - Already liked
- `401` - Unauthorized
- `500` - Server error

---

### 7️⃣ UNLIKE VIDEO/REEL
```http
POST https://api.buyviro.com/unlike
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "mediaId": "media_98765xyz",
  "userId": "user_12345abcde"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Like removed successfully",
  "mediaId": "media_98765xyz",
  "likeCount": 342,
  "isLiked": false,
  "removedAt": "2026-05-18T10:32:00.000Z"
}
```

**Errors:**
- `400` - Media not found
- `400` - Not liked yet
- `401` - Unauthorized
- `500` - Server error

---

### 8️⃣ ADD COMMENT
```http
POST https://api.buyviro.com/comment
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "mediaId": "media_98765xyz",
  "userId": "user_12345abcde",
  "username": "john_doe",
  "text": "This is awesome! 😍",
  "parentCommentId": null
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Comment added successfully",
  "comment": {
    "commentId": "comment_11223344",
    "mediaId": "media_98765xyz",
    "userId": "user_12345abcde",
    "username": "john_doe",
    "userProfilePic": "https://r2-url/profile.jpg",
    "text": "This is awesome! 😍",
    "likes": 0,
    "replies": 0,
    "parentCommentId": null,
    "isEdited": false,
    "createdAt": "2026-05-18T10:30:00.000Z"
  },
  "totalComments": 90
}
```

**Errors:**
- `400` - Media not found
- `400` - Comment text empty
- `401` - Unauthorized
- `500` - Server error

---

### 9️⃣ GET COMMENTS
```http
GET https://api.buyviro.com/comments?mediaId=MEDIA_ID&limit=20&offset=0&sort=recent
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `mediaId` - Media ID (required)
- `limit` - Number of comments (default: 20)
- `offset` - Pagination offset (default: 0)
- `sort` - Sort by: "recent" | "popular" | "oldest" (default: recent)

**Response (200 OK):**
```json
{
  "success": true,
  "comments": [
    {
      "commentId": "comment_11223344",
      "mediaId": "media_98765xyz",
      "userId": "user_12345abcde",
      "username": "john_doe",
      "userProfilePic": "https://r2-url/profile.jpg",
      "text": "This is awesome! 😍",
      "likes": 12,
      "replies": 3,
      "parentCommentId": null,
      "isEdited": false,
      "createdAt": "2026-05-18T10:30:00.000Z",
      "replies": [
        {
          "commentId": "reply_55667788",
          "text": "Thanks! 🙏",
          "username": "creator_name",
          "likes": 5,
          "createdAt": "2026-05-18T10:35:00.000Z"
        }
      ]
    }
  ],
  "total": 90,
  "hasMore": true
}
```

---

### 🔟 FOLLOW USER
```http
POST https://api.buyviro.com/follow
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "followerId": "user_12345abcde",
  "followingId": "user_98765xyz"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User followed successfully",
  "followingId": "user_98765xyz",
  "followerCount": 151,
  "isFollowing": true,
  "followedAt": "2026-05-18T10:30:00.000Z"
}
```

---

### 1️⃣1️⃣ UNFOLLOW USER
```http
POST https://api.buyviro.com/unfollow
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "followerId": "user_12345abcde",
  "followingId": "user_98765xyz"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User unfollowed successfully",
  "followingId": "user_98765xyz",
  "followerCount": 150,
  "isFollowing": false,
  "unfollowedAt": "2026-05-18T10:32:00.000Z"
}
```

---

### 1️⃣2️⃣ GET USER PROFILE
```http
GET https://api.buyviro.com/profile?userId=USER_ID
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "userId": "user_12345abcde",
    "email": "user@example.com",
    "phone": "+919876543210",
    "username": "john_doe",
    "firstName": "John",
    "lastName": "Doe",
    "profilePicture": "https://r2-url/profile.jpg",
    "coverPicture": "https://r2-url/cover.jpg",
    "bio": "Love making reels!",
    "followers": 150,
    "following": 45,
    "totalVideos": 28,
    "totalLikes": 5420,
    "verified": false,
    "joinedAt": "2026-01-15T00:00:00.000Z",
    "isFollowing": false,
    "isFollowedBy": false
  }
}
```

---

### 1️⃣3️⃣ UPDATE PROFILE
```http
PUT https://api.buyviro.com/profile
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "userId": "user_12345abcde",
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Updated bio",
  "profilePicture": "https://r2-url/new-profile.jpg",
  "coverPicture": "https://r2-url/new-cover.jpg"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "userId": "user_12345abcde",
    "firstName": "John",
    "lastName": "Doe",
    "bio": "Updated bio",
    "profilePicture": "https://r2-url/new-profile.jpg",
    "coverPicture": "https://r2-url/new-cover.jpg",
    "updatedAt": "2026-05-18T10:30:00.000Z"
  }
}
```

---

### 1️⃣4️⃣ DELETE MEDIA
```http
DELETE https://api.buyviro.com/media/MEDIA_ID
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Media deleted successfully",
  "mediaId": "media_98765xyz",
  "deletedAt": "2026-05-18T10:30:00.000Z"
}
```

**Errors:**
- `404` - Media not found
- `403` - Unauthorized (not owner)
- `500` - Server error

---

### 1️⃣5️⃣ SEARCH VIDEOS
```http
GET https://api.buyviro.com/search?q=viral&type=video&limit=20&offset=0
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `q` - Search query (required)
- `type` - Search type: "video" | "user" | "tag" | "all" (default: all)
- `limit` - Results per page (default: 20)
- `offset` - Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "success": true,
  "results": {
    "videos": [
      {
        "mediaId": "media_98765xyz",
        "title": "Viral Video",
        "url": "https://pub-r2.dev/video.mp4",
        "thumbnail": "https://pub-r2.dev/thumb.jpg",
        "uploadedBy": {
          "userId": "user_abc123",
          "username": "creator"
        },
        "views": 50000,
        "likes": 2300
      }
    ],
    "users": [],
    "tags": []
  },
  "total": 245
}
```

---

### 1️⃣6️⃣ GET CONVERSATIONS (Chat List)
```http
GET https://api.buyviro.com/conversations?userId=USER_ID&limit=20&offset=0
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `userId` - Current user ID (required)
- `limit` - Number of conversations (default: 20)
- `offset` - Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "success": true,
  "conversations": [
    {
      "conversationId": "conv_12345xyz",
      "participantId": "user_abc123",
      "participantInfo": {
        "userId": "user_abc123",
        "username": "john_friend",
        "profilePicture": "https://r2-url/profile.jpg",
        "isOnline": true
      },
      "lastMessage": {
        "messageId": "msg_xyz123",
        "text": "Hey! How are you?",
        "timestamp": "2026-05-18T10:30:00.000Z",
        "senderId": "user_abc123"
      },
      "unreadCount": 3,
      "createdAt": "2026-05-01T00:00:00.000Z",
      "updatedAt": "2026-05-18T10:30:00.000Z"
    }
  ],
  "total": 45,
  "hasMore": true
}
```

---

### 1️⃣7️⃣ GET MESSAGES (Conversation Messages)
```http
GET https://api.buyviro.com/messages?conversationId=CONV_ID&limit=50&offset=0
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `conversationId` - Conversation ID (required)
- `limit` - Number of messages (default: 50)
- `offset` - Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "success": true,
  "messages": [
    {
      "messageId": "msg_xyz123",
      "conversationId": "conv_12345xyz",
      "senderId": "user_abc123",
      "recipientId": "user_12345abcde",
      "text": "Hey! How are you?",
      "mediaUrl": null,
      "mediaType": null,
      "isRead": true,
      "readAt": "2026-05-18T10:32:00.000Z",
      "timestamp": "2026-05-18T10:30:00.000Z"
    },
    {
      "messageId": "msg_abc789",
      "conversationId": "conv_12345xyz",
      "senderId": "user_12345abcde",
      "recipientId": "user_abc123",
      "text": "I'm doing great!",
      "mediaUrl": null,
      "mediaType": null,
      "isRead": true,
      "readAt": "2026-05-18T10:32:30.000Z",
      "timestamp": "2026-05-18T10:31:00.000Z"
    }
  ],
  "total": 250,
  "hasMore": true
}
```

---

### 1️⃣8️⃣ CREATE TEXT POST (Thoughts/Status)
```http
POST https://api.buyviro.com/post
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "userId": "user_12345abcde",
  "postType": "thought",
  "text": "Just launched my new app! 🚀 Super excited!",
  "hashtags": ["app", "launch", "excited"],
  "mentions": ["user_abc123"],
  "visibility": "public"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Post created successfully",
  "post": {
    "postId": "post_44556677",
    "userId": "user_12345abcde",
    "username": "john_doe",
    "postType": "thought",
    "text": "Just launched my new app! 🚀 Super excited!",
    "hashtags": ["app", "launch", "excited"],
    "mentions": ["user_abc123"],
    "visibility": "public",
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "createdAt": "2026-05-18T10:30:00.000Z",
    "updatedAt": "2026-05-18T10:30:00.000Z"
  }
}
```

**Errors:**
- `400` - Empty post text
- `401` - Unauthorized
- `413` - Post too long (max 500 chars)
- `500` - Server error

---

### 1️⃣9️⃣ WEBSOCKET CONNECTION (Real-time)
```http
GET wss://api.buyviro.com/ws?userId=USER_ID&token=JWT_TOKEN
Upgrade: websocket
Connection: Upgrade
```

**Authentication Methods (Choose One):**

**Option 1: Query Parameter (Recommended for Flutter)**
```
wss://api.buyviro.com/ws?userId=user_12345abcde&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Option 2: Custom Header**
```http
GET wss://api.buyviro.com/ws?userId=USER_ID
X-Auth-Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Option 3: Legacy Authorization Header**
```http
GET wss://api.buyviro.com/ws?userId=USER_ID
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ Flutter WebSocket Implementation Note:**
- Query parameters are easiest in Flutter (use in URL directly)
- Custom headers work but require extra setup in WebSocket client
- Standard Authorization header may not work on some browsers/WebSocket clients

**Connection Events:**

**1. User Connected:**
```json
{
  "type": "user:connected",
  "userId": "user_12345abcde",
  "status": "online",
  "timestamp": "2026-05-18T10:30:00.000Z"
}
```

**2. New Message:**
```json
{
  "type": "message:new",
  "messageId": "msg_xyz123",
  "senderId": "user_abc123",
  "recipientId": "user_12345abcde",
  "text": "Hey, how are you?",
  "timestamp": "2026-05-18T10:30:00.000Z"
}
```

**3. Typing Indicator:**
```json
{
  "type": "typing:start",
  "userId": "user_abc123",
  "timestamp": "2026-05-18T10:30:00.000Z"
}
```

**4. WebRTC Offer:**
```json
{
  "type": "webrtc:offer",
  "from": "user_abc123",
  "to": "user_12345abcde",
  "offer": {
    "type": "offer",
    "sdp": "v=0\r\no=..."
  }
}
```

**5. WebRTC Answer:**
```json
{
  "type": "webrtc:answer",
  "from": "user_12345abcde",
  "to": "user_abc123",
  "answer": {
    "type": "answer",
    "sdp": "v=0\r\no=..."
  }
}
```

**6. ICE Candidate:**
```json
{
  "type": "webrtc:candidate",
  "from": "user_abc123",
  "to": "user_12345abcde",
  "candidate": {
    "candidate": "candidate:...",
    "sdpMLineIndex": 0,
    "sdpMid": "0"
  }
}
```

**7. User Disconnected:**
```json
{
  "type": "user:disconnected",
  "userId": "user_abc123",
  "status": "offline",
  "timestamp": "2026-05-18T10:35:00.000Z"
}
```

---

## �📋 Common Tasks & Solutions

### Task: Add New API Endpoint
1. Edit `src/index.js`
2. Add route handler (GET/POST)
3. Update `wrangler.toml` routes if needed
4. Test with deployment

### Task: Modify Upload Service
1. Edit `src/index.js` - MediaService section
2. Update file validation logic or filename generation
3. Max file: 500MB (configured in code)
4. R2 bucket binding: `MY_R2_BUCKET`

### Task: Enhance Real-time Features
1. Edit `src/index.js` - SocketService section
2. Update message handlers
3. Add new WebSocket event types
4. Test with multiple client connections

### Task: Improve Feed Algorithm
1. Edit `src/feedAlgorithm.js`
2. Adjust ranking factors and weights
3. Update engagement scoring
4. Test with real data

### Task: Deploy Changes
1. Ensure all changes are in `src/` and `wrangler.toml`
2. Run: `wrangler deploy`
3. Monitor: Check Cloudflare dashboard
4. Verify endpoints at `api.buyviro.com`

---

## 🔧 Important Files & Their Roles

| File | Purpose | Critical? |
|------|---------|-----------|
| `src/index.js` | Main Worker entry, upload & WebSocket | ✓ Yes |
| `wrangler.toml` | Cloudflare configuration | ✓ Yes |
| `src/feedAlgorithm.js` | Feed recommendation logic | ✓ Yes |
| `src/engagementTracker.js` | User engagement tracking | ✓ Yes |
| `src/feedAPIService.js` | Feed service abstraction | Medium |
| `package.json` | Dependencies | ✓ Yes |
| `README.md` | Documentation | Reference |
| `DEPLOYMENT.md` | Deployment guide | Reference |

---

## 🎯 Gemini Task Guidelines

### When Fixing Issues:
1. **Check error logs** in Cloudflare dashboard
2. **Verify R2 bucket** access and permissions
3. **Test endpoints** before deployment
4. **Review wrangler.toml** for route conflicts
5. **Check APK compatibility** with API format

### When Adding Features:
1. **Keep backward compatibility** with existing APK
2. **Use environment variables** for config
3. **Validate input** strictly (file size, type)
4. **Add error handling** for edge cases
5. **Test WebSocket** connections thoroughly

### When Optimizing:
1. **Monitor upload times** for large files
2. **Track WebSocket connection stability**
3. **Analyze feed algorithm performance**
4. **Check R2 bandwidth usage**
5. **Profile Worker CPU time**

---

## 📱 APK Integration Points

The Flutter APK expects:
1. **POST /upload** - Returns `{ success, fileName, url, size, timestamp }`
2. **GET /ws?userId=USER_ID** - WebSocket upgrade for real-time features
3. **GET /health** - For health check and connectivity verification

### APK-to-Backend Flow:
```
Flutter APK
    ↓
    ├─→ POST /upload → R2 Storage → Public URL returned
    └─→ GET /ws?userId=XYZ → Real-time messaging
```

---

## ⚠️ Critical Constraints

- **Max Upload:** 500MB per file
- **R2 Bucket:** Must be publicly readable
- **WebSocket:** Requires Cloudflare Workers Plus
- **Domain:** api.buyviro.com (production)
- **API Response Format:** Must match APK expectations

---

## 🔄 Development Workflow

1. **Modify code** in `src/`
2. **Update config** in `wrangler.toml` if needed
3. **Test locally** with `wrangler dev`
4. **Deploy** with `wrangler deploy`
5. **Verify** by hitting endpoints
6. **Monitor** Cloudflare dashboard for errors

---

## 📚 Documentation Files

- **README.md** - Project overview and architecture
- **PROJECT_SUMMARY.md** - Detailed project information
- **QUICKSTART.md** - Quick setup guide
- **DEPLOYMENT.md** - Deployment instructions
- **DEPLOYMENT_CHECKLIST.md** - Pre-deployment checklist
- **ADVANCED_FEATURES_GUIDE.md** - Advanced features documentation
- **FEED_ALGORITHM_GUIDE.md** - Feed algorithm details
- **FEED_IMPLEMENTATION.md** - Feed implementation guide
- **FLUTTER_INTEGRATION.md** - Flutter APK integration guide
- **SUPABASE_REFERENCE.sql** - Database schema (if used)
- **ALGORITHM_EXPLANATION.md** - Algorithm documentation
- **API_RESPONSE_SUMMARY.md** - API response formats

---

## 🎓 When to Use Each Guide

- **Need quick setup?** → QUICKSTART.md
- **Deploying to production?** → DEPLOYMENT.md
- **Pre-deployment check?** → DEPLOYMENT_CHECKLIST.md
- **Integrating Flutter APK?** → FLUTTER_INTEGRATION.md
- **Understanding feed?** → FEED_ALGORITHM_GUIDE.md
- **Database questions?** → SUPABASE_REFERENCE.sql + SUPABASE_SCHEMA.md
- **Advanced features?** → ADVANCED_FEATURES_GUIDE.md

---

## 🚨 Troubleshooting Checklist

### Upload Endpoint Failing?
- [ ] Check R2 bucket permissions
- [ ] Verify MY_R2_BUCKET binding in wrangler.toml
- [ ] Check file size (max 500MB)
- [ ] Verify API domain (api.buyviro.com)
- [ ] Check Cloudflare Workers logs

### WebSocket Not Connecting?
- [ ] Verify Cloudflare Workers Plus plan
- [ ] Check userId parameter passed
- [ ] Review WebSocket handler in src/index.js
- [ ] Check browser console for connection errors
- [ ] Verify TLS/SSL certificate

### Deployment Issues?
- [ ] Run `wrangler deploy --verbose`
- [ ] Check wrangler.toml syntax
- [ ] Verify Cloudflare account credentials
- [ ] Check for route conflicts
- [ ] Review recent commits in git log

---

## 📞 Quick Reference Commands

```bash
# Install dependencies
npm install

# Start local development
wrangler dev

# Deploy to production
wrangler deploy

# View logs
wrangler tail

# Check version
wrangler --version
```

---

## ❓ FREQUENTLY ASKED QUESTIONS (For Gemini)

### Q1: Chat/Messaging Endpoints - कहाँ से Messages fetch करें?

**Answer:** तीन endpoints हैं messaging के लिए:

1. **GET `/conversations`** - सभी conversations/chats की list
   - हर conversation में last message preview मिलता है
   - Unread count दिखता है
   
2. **GET `/messages?conversationId=ID`** - किसी specific conversation के सभी messages
   - पुरानी messages भी fetch हो सकती हैं (pagination से)
   - Read status दिखता है

3. **WebSocket `/ws`** - Real-time नए messages के लिए
   - Instant message delivery
   - Typing indicators

```
Purani Messages:   GET /conversations → GET /messages?conversationId=XXX
Real-time Messages: GET /ws → listen to "message:new" events
```

---

### Q2: WebSocket Authentication - कौनसा तरीका use करें?

**Answer:** Flutter के लिए **Query Parameter** सबसे आसान है:

```javascript
// ✅ RECOMMENDED (Flutter के लिए)
wss://api.buyviro.com/ws?userId=user_123&token=eyJhbGciOiJI...

// Also supports:
wss://api.buyviro.com/ws?userId=user_123&token=JWT_TOKEN_HERE
```

**तीनों तरीके काम करते हैं:**
```
1. Query Parameter ← Best for Flutter
2. Custom Header (X-Auth-Token) ← For advanced clients  
3. Authorization Header ← Legacy support
```

**Flutter Implementation:**
```dart
final token = "your_jwt_token";
final userId = "user_123";
final wsUrl = "wss://api.buyviro.com/ws?userId=$userId&token=$token";
final channel = WebSocketChannel.connect(Uri.parse(wsUrl));
```

---

### Q3: Text Posts (Thoughts) - कहाँ भेजें?

**Answer:** नया endpoint है `/post` (File के बिना):

```javascript
// ❌ WRONG - /upload के लिए file required है
POST /upload (without file) → Error!

// ✅ CORRECT - Text-only posts के लिए /post
POST /post {
  "postType": "thought",
  "text": "My amazing thought",
  "hashtags": ["tag1", "tag2"]
}
```

**Media Types तीन हैं:**
```
1. video/image/reel  → POST /upload (with file)
2. thought (text)    → POST /post (without file)
3. mixed (text+media) → POST /upload (with file + text)
```

---

## 🔍 Quick Endpoint Decision Guide

| काम करना है | Endpoint | Method | File? | Notes |
|-----------|----------|--------|-------|-------|
| Video upload | `/upload` | POST | ✓ Yes | Max 500MB |
| Photo upload | `/upload` | POST | ✓ Yes | Any image |
| Text post | `/post` | POST | ✗ No | Thought/status |
| Feed देखना | `/feed` | GET | - | Trending/recent |
| Chat history | `/conversations` | GET | - | Conversation list |
| Old messages | `/messages` | GET | - | Per conversation |
| Real-time chat | `/ws` | GET (WS) | - | Query param auth |

---

## 🚀 IMPLEMENTATION CHECKLIST for Backend

### Must-Have Endpoints (Confirmed):
- [ ] `POST /register` - User registration
- [ ] `POST /login` - User login  
- [ ] `POST /upload` - Media upload (video/image/reel)
- [ ] `POST /post` - Text-only posts (Thoughts)
- [ ] `GET /feed` - Personalized feed
- [ ] `POST /like` & `POST /unlike` - Like/unlike
- [ ] `POST /comment` - Add comments
- [ ] `GET /conversations` - Chat list
- [ ] `GET /messages` - Conversation messages
- [ ] `POST /follow` & `POST /unfollow` - Follow system
- [ ] `GET /profile` & `PUT /profile` - User profile
- [ ] `GET /search` - Search functionality
- [ ] `GET /ws` - WebSocket connection

### WebSocket Events (Real-time):
- [ ] `message:new` - New message received
- [ ] `typing:start` / `typing:stop` - Typing indicator
- [ ] `user:connected` / `user:disconnected` - User status
- [ ] `webrtc:offer` / `webrtc:answer` - Video call signaling
- [ ] `webrtc:candidate` - ICE candidates

---

**Remember:** Query parameters work best for WebSocket in Flutter. Use `/post` for text-only content. Fetch conversation list first, then individual messages! 🎯

---

**Remember:** Always test changes locally before deploying to production! 🚀
