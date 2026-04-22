# 📚 API DOCUMENTATION (UPDATED SCHEMA)
## ShortsTalkSyra - Complete API Reference

---

## 📖 TABLE OF CONTENTS
1. [Posts & Reels](#posts--reels)
2. [Stories](#stories)
3. [Groups](#groups)
4. [Thoughts](#thoughts)
5. [Polls](#polls)
6. [Notifications](#notifications)
7. [Messages & Conversations](#messages--conversations)
8. [Calls](#calls)

---

## 🎬 POSTS & REELS

### Create Post/Reel
```
POST /api/posts/create
Content-Type: multipart/form-data

Parameters:
  - user_id (TEXT, REQUIRED) - Post creator's user ID
  - type (TEXT) - 'post', 'reel', or 'story' (default: 'post')
  - caption (TEXT) - Post caption/description
  - visibility (TEXT) - 'public' or 'private' (default: 'public')
  - video (FILE) - Video file for reels
  - duration (FLOAT) - Video duration in seconds
  - width (INTEGER) - Video width
  - height (INTEGER) - Video height

Response:
{
  "success": true,
  "postId": "1234567890_abc123",
  "message": "Post created successfully"
}
```

### Get Feed Posts
```
GET /api/posts/feed?limit=50&offset=0

Query Parameters:
  - limit (INTEGER) - Number of posts (default: 50)
  - offset (INTEGER) - Pagination offset (default: 0)

Response:
{
  "success": true,
  "posts": [
    {
      "id": "post_id",
      "user_id": "user_123",
      "type": "reel",
      "caption": "Amazing sunset!",
      "visibility": "public",
      "like_count": 245,
      "comment_count": 12,
      "share_count": 5,
      "view_count": 1240,
      "created_at": "2026-04-21T10:30:00Z",
      "updated_at": "2026-04-21T10:30:00Z"
    }
  ]
}
```

### Get User Posts
```
GET /api/posts/user/{user_id}?limit=20&offset=0

Response:
{
  "success": true,
  "posts": [...]
}
```

### Get Post Detail
```
GET /api/posts/detail/{post_id}

Response:
{
  "success": true,
  "post": {
    "id": "post_id",
    "user_id": "user_123",
    "type": "reel",
    "caption": "Amazing content",
    "visibility": "public",
    "like_count": 245,
    "comment_count": 12,
    "share_count": 5,
    "view_count": 1240,
    "created_at": "2026-04-21T10:30:00Z",
    "reel": {
      "id": "reel_id",
      "post_id": "post_id",
      "video_url": "https://...",
      "thumbnail_url": "https://...",
      "duration": 15.5,
      "width": 1080,
      "height": 1920,
      "audio_name": "summer_vibes",
      "audio_url": "https://...",
      "is_monetized": 0
    }
  }
}
```

### Update Post
```
POST /api/posts/update
Content-Type: multipart/form-data

Parameters:
  - postId (TEXT, REQUIRED)
  - caption (TEXT)
  - visibility (TEXT)

Response:
{
  "success": true,
  "message": "Post updated"
}
```

### Delete Post
```
POST /api/posts/delete
Content-Type: multipart/form-data

Parameters:
  - postId (TEXT, REQUIRED)

Response:
{
  "success": true,
  "message": "Post deleted"
}
```

### Track Post View
```
POST /api/posts/view
Content-Type: multipart/form-data

Parameters:
  - postId (TEXT, REQUIRED)

Response:
{
  "success": true
}
```

---

## 📖 STORIES

### Create Story
```
POST /api/stories/create
Content-Type: multipart/form-data

Parameters:
  - user_id (TEXT, REQUIRED) - Story creator
  - media (FILE) - Image or video file
  - media_type (TEXT) - 'image' or 'video' (default: 'image')
  - caption (TEXT) - Story caption
  - duration (FLOAT) - Duration in seconds (for videos)

Response:
{
  "success": true,
  "storyId": "story_1234567890",
  "message": "Story created"
}

Notes:
  - Stories automatically expire after 24 hours
  - Can be image or video
  - Viewable by followers (based on privacy settings)
```

### Get User Stories
```
GET /api/stories/user/{user_id}

Response:
{
  "success": true,
  "stories": [
    {
      "id": "story_id",
      "user_id": "user_123",
      "media_url": "https://...",
      "media_type": "image",
      "thumbnail_url": "https://...",
      "duration": 5.0,
      "caption": "Beautiful day!",
      "view_count": 145,
      "expires_at": "2026-04-22T10:30:00Z",
      "created_at": "2026-04-21T10:30:00Z"
    }
  ]
}
```

### Add Story View
```
POST /api/stories/view
Content-Type: multipart/form-data

Parameters:
  - story_id (TEXT, REQUIRED)
  - user_id (TEXT, REQUIRED)

Response:
{
  "success": true
}
```

### Get Story Viewers
```
GET /api/stories/{story_id}/viewers

Response:
{
  "success": true,
  "viewers": [
    {
      "id": "view_id",
      "story_id": "story_id",
      "user_id": "user_456",
      "created_at": "2026-04-21T11:00:00Z"
    }
  ]
}
```

---

## 👥 GROUPS

### Create Group
```
POST /api/groups/create
Content-Type: multipart/form-data

Parameters:
  - name (TEXT, REQUIRED) - Group name
  - description (TEXT) - Group description
  - created_by (TEXT, REQUIRED) - Creator user ID
  - is_private (INTEGER) - 0 for public, 1 for private
  - image (FILE) - Group cover image

Response:
{
  "success": true,
  "groupId": "group_1234567890",
  "message": "Group created"
}
```

### Add Group Member
```
POST /api/groups/members/add
Content-Type: multipart/form-data

Parameters:
  - group_id (TEXT, REQUIRED)
  - user_id (TEXT, REQUIRED)

Response:
{
  "success": true
}
```

### Get Group Members
```
GET /api/groups/{group_id}/members

Response:
{
  "success": true,
  "members": [
    {
      "id": "member_id",
      "group_id": "group_id",
      "user_id": "user_123",
      "role": "admin",
      "status": "active",
      "joined_at": "2026-04-21T10:30:00Z"
    }
  ]
}
```

---

## 💭 THOUGHTS

### Create Thought
```
POST /api/thoughts/create
Content-Type: multipart/form-data

Parameters:
  - post_id (TEXT, REQUIRED) - Associated post
  - text (TEXT, REQUIRED) - Thought content

Response:
{
  "success": true,
  "thoughtId": "thought_1234567890",
  "message": "Thought created"
}
```

### Get Post Thoughts
```
GET /api/thoughts/post/{post_id}?limit=20&offset=0

Response:
{
  "success": true,
  "thoughts": [
    {
      "id": "thought_id",
      "post_id": "post_id",
      "text": "This is amazing!",
      "reply_count": 5,
      "like_count": 23,
      "repost_count": 2,
      "view_count": 150,
      "is_edited": 0,
      "is_deleted": 0,
      "created_at": "2026-04-21T10:30:00Z",
      "updated_at": "2026-04-21T10:30:00Z"
    }
  ]
}
```

---

## 🗳️ POLLS

### Create Poll
```
POST /api/polls/create
Content-Type: multipart/form-data

Parameters:
  - post_id (TEXT, REQUIRED)
  - question (TEXT, REQUIRED) - Poll question
  - expires_at (TEXT) - Expiration timestamp (optional)
  - is_multiple (INTEGER) - 0 for single choice, 1 for multiple (default: 0)

Response:
{
  "success": true,
  "pollId": "poll_1234567890",
  "message": "Poll created"
}
```

### Add Poll Option
```
POST /api/polls/options/add
Content-Type: multipart/form-data

Parameters:
  - poll_id (TEXT, REQUIRED)
  - option_text (TEXT, REQUIRED)

Response:
{
  "success": true,
  "optionId": "option_1234567890",
  "message": "Option added"
}
```

### Cast Vote
```
POST /api/polls/vote
Content-Type: multipart/form-data

Parameters:
  - poll_id (TEXT, REQUIRED)
  - user_id (TEXT, REQUIRED)
  - option_id (TEXT, REQUIRED)

Response:
{
  "success": true,
  "message": "Vote cast"
}
```

### Get Poll
```
GET /api/polls/{poll_id}

Response:
{
  "success": true,
  "poll": {
    "id": "poll_id",
    "post_id": "post_id",
    "question": "What's your favorite color?",
    "total_votes": 156,
    "expires_at": "2026-04-28T10:30:00Z",
    "is_multiple": 0,
    "created_at": "2026-04-21T10:30:00Z",
    "options": [
      {
        "id": "option_id",
        "poll_id": "poll_id",
        "option_text": "Red",
        "vote_count": 45
      },
      {
        "id": "option_id2",
        "poll_id": "poll_id",
        "option_text": "Blue",
        "vote_count": 67
      }
    ]
  }
}
```

---

## 🔔 NOTIFICATIONS

### Get Notifications
```
GET /api/notifications?user_id=user_123&limit=20&offset=0

Response:
{
  "success": true,
  "notifications": [
    {
      "id": "notif_id",
      "user_id": "user_123",
      "actor_id": "user_456",
      "type": "like",
      "entity_id": "post_id",
      "text": "John liked your post",
      "is_read": 0,
      "created_at": "2026-04-21T11:00:00Z"
    }
  ]
}
```

### Mark as Read
```
POST /api/notifications/read
Content-Type: multipart/form-data

Parameters:
  - notification_id (TEXT, REQUIRED)

Response:
{
  "success": true
}
```

---

## 💬 MESSAGES & CONVERSATIONS

### Create Conversation
```
POST /api/conversations/create
Content-Type: multipart/form-data

Parameters:
  - type (TEXT) - 'private' or 'group'
  - name (TEXT) - Group name (for group conversations)
  - image (TEXT) - Group image URL
  - created_by (TEXT, REQUIRED)

Response:
{
  "success": true,
  "conversationId": "conv_1234567890",
  "message": "Conversation created"
}
```

### Send Message
```
POST /api/messages/send
Content-Type: multipart/form-data

Parameters:
  - conversation_id (TEXT, REQUIRED)
  - sender_id (TEXT, REQUIRED)
  - type (TEXT) - 'text', 'image', 'video', 'audio' (default: 'text')
  - content (TEXT) - Message content
  - media (FILE) - Media file (for non-text messages)

Response:
{
  "success": true,
  "messageId": "msg_1234567890",
  "message": "Message sent"
}
```

### Get Messages
```
GET /api/messages/{conversation_id}?limit=50&offset=0

Response:
{
  "success": true,
  "messages": [
    {
      "id": "msg_id",
      "conversation_id": "conv_id",
      "sender_id": "user_123",
      "type": "text",
      "content": "Hey, how are you?",
      "media_url": null,
      "thumbnail_url": null,
      "is_deleted": 0,
      "created_at": "2026-04-21T11:00:00Z",
      "updated_at": "2026-04-21T11:00:00Z"
    }
  ]
}
```

---

## 📞 CALLS

### Start Call
```
POST /api/calls/start
Content-Type: multipart/form-data

Parameters:
  - conversation_id (TEXT) - Optional, for group calls
  - caller_id (TEXT, REQUIRED)
  - call_type (TEXT) - 'voice' or 'video' (default: 'voice')

Response:
{
  "success": true,
  "callId": "call_1234567890",
  "roomId": "room_xyz",
  "sessionId": "session_abc",
  "message": "Call started"
}
```

---

## 📊 DATABASE SCHEMA UPDATES

### NEW TABLE: posts
```sql
- id TEXT PRIMARY KEY
- user_id TEXT NOT NULL
- type TEXT NOT NULL ('post', 'reel', 'story')
- caption TEXT
- visibility TEXT DEFAULT 'public'
- like_count INTEGER DEFAULT 0
- comment_count INTEGER DEFAULT 0
- share_count INTEGER DEFAULT 0
- view_count INTEGER DEFAULT 0
- created_at TEXT
- updated_at TEXT
```

### NEW TABLE: reels
```sql
- id TEXT PRIMARY KEY
- post_id TEXT NOT NULL (FK to posts)
- video_url TEXT NOT NULL
- thumbnail_url TEXT
- duration REAL
- width INTEGER
- height INTEGER
- audio_name TEXT
- audio_url TEXT
- view_count INTEGER DEFAULT 0
- like_count INTEGER DEFAULT 0
- comment_count INTEGER DEFAULT 0
- share_count INTEGER DEFAULT 0
- is_monetized INTEGER DEFAULT 0
- created_at TEXT
- updated_at TEXT
```

### NEW TABLE: stories
```sql
- id TEXT PRIMARY KEY
- user_id TEXT NOT NULL
- media_url TEXT NOT NULL
- media_type TEXT ('image' or 'video')
- thumbnail_url TEXT
- duration REAL
- caption TEXT
- view_count INTEGER DEFAULT 0
- expires_at TEXT (auto-expire after 24h)
- created_at TEXT
```

### NEW TABLES: groups, group_members, group_invites, group_posts
### NEW TABLES: thoughts, thought_reposts, thought_replies
### NEW TABLES: polls, poll_options, poll_votes

---

## ✅ EXAMPLE WORKFLOWS

### Create and Share a Reel
```
1. POST /api/posts/create
   - type: "reel"
   - caption: "Check out this amazing sunset!"
   - visibility: "public"
   - video: <file>

2. POST /api/posts/view (track views)

3. POST /api/social/like (if user likes it)

4. POST /api/thoughts/create (add a comment)
```

### Create a Story
```
1. POST /api/stories/create
   - user_id: "user_123"
   - media: <image or video>
   - caption: "Beautiful day!"

2. POST /api/stories/view (when someone views it)

3. GET /api/stories/{story_id}/viewers (see who viewed)
```

### Create and Vote on a Poll
```
1. POST /api/polls/create
   - post_id: "post_123"
   - question: "What's your favorite color?"

2. POST /api/polls/options/add (add options)

3. POST /api/polls/vote (cast vote)

4. GET /api/polls/{poll_id} (see results)
```

---

**Last Updated:** April 21, 2026  
**Version:** 2.0 (NEW SCHEMA)  
**Status:** Ready for Integration ✅
