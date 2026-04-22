# 🚀 QUICK START GUIDE (UPDATED SCHEMA)
## ShortsTalkSyra Backend - Integration Guide

---

## 📋 WHAT'S BEEN UPDATED?

```
✅ Posts Table - SIMPLIFIED (id, user_id, type, caption, visibility + counts)
✅ Reels Table - NEW (linked to posts, contains video details)
✅ Stories Table - NEW (auto-expire after 24 hours)
✅ Groups System - NEW (create, manage members, post in groups)
✅ Thoughts System - NEW (short text content like tweets)
✅ Polls System - NEW (questions, options, voting)
✅ All endpoints updated with new field names
```

---

## 🎯 STEP 1: SETUP

### Prerequisites
- Flutter/Dart APK development environment
- API testing tool (Postman, Thunder Client, etc.)
- Cloudflare account with Workers setup

### Environment Variables
```bash
# .env or wrangler.toml
DATABASE_ID = "e5c60c09-bbc6-474f-a8f5-e6f279474b41"
BUCKET_NAME = "socialapkvideos"
R2_PUBLIC_URL = "https://buyviro.com"
WORKER_URL = "https://your-worker.dev"
```

---

## 📱 STEP 2: APK INTEGRATION EXAMPLES

### 2.1 Create a Reel Post

**Dart Code:**
```dart
import 'package:dio/dio.dart';

Future<void> createReel() async {
  try {
    var formData = FormData.fromMap({
      'user_id': 'user_123',
      'type': 'reel',
      'caption': 'Amazing sunset!',
      'visibility': 'public',
      'video': await MultipartFile.fromFile(
        videoPath,
        filename: 'reel.mp4',
      ),
      'duration': 15.5,
      'width': 1080,
      'height': 1920,
    });

    var response = await dio.post(
      'https://your-worker.dev/api/posts/create',
      data: formData,
    );

    print('Post created: ${response.data['postId']}');
  } catch (e) {
    print('Error: $e');
  }
}
```

### 2.2 Get Feed Posts

**Dart Code:**
```dart
Future<List<Post>> getFeedPosts({int limit = 50, int offset = 0}) async {
  try {
    var response = await dio.get(
      'https://your-worker.dev/api/posts/feed',
      queryParameters: {
        'limit': limit,
        'offset': offset,
      },
    );

    List<Post> posts = (response.data['posts'] as List)
        .map((p) => Post.fromJson(p))
        .toList();

    return posts;
  } catch (e) {
    print('Error: $e');
    return [];
  }
}

class Post {
  String id;
  String userId;
  String type;
  String caption;
  int likeCount;
  int commentCount;
  int shareCount;
  int viewCount;
  Reel? reel;

  Post.fromJson(Map<String, dynamic> json)
    : id = json['id'],
      userId = json['user_id'],
      type = json['type'],
      caption = json['caption'],
      likeCount = json['like_count'] ?? 0,
      commentCount = json['comment_count'] ?? 0,
      shareCount = json['share_count'] ?? 0,
      viewCount = json['view_count'] ?? 0,
      reel = json['reel'] != null ? Reel.fromJson(json['reel']) : null;
}

class Reel {
  String id;
  String postId;
  String videoUrl;
  String? thumbnailUrl;
  double? duration;

  Reel.fromJson(Map<String, dynamic> json)
    : id = json['id'],
      postId = json['post_id'],
      videoUrl = json['video_url'],
      thumbnailUrl = json['thumbnail_url'],
      duration = json['duration'];
}
```

### 2.3 Create a Story

**Dart Code:**
```dart
Future<void> createStory(File mediaFile, bool isVideo) async {
  try {
    var formData = FormData.fromMap({
      'user_id': 'user_123',
      'media': await MultipartFile.fromFile(
        mediaFile.path,
        filename: isVideo ? 'story.mp4' : 'story.jpg',
      ),
      'media_type': isVideo ? 'video' : 'image',
      'caption': 'Check this out!',
      'duration': isVideo ? 10.0 : null,
    });

    var response = await dio.post(
      'https://your-worker.dev/api/stories/create',
      data: formData,
    );

    print('Story created: ${response.data['storyId']}');
    
    // Story will auto-expire after 24 hours
  } catch (e) {
    print('Error: $e');
  }
}
```

### 2.4 Create a Poll

**Dart Code:**
```dart
Future<void> createPoll(String postId, String question, List<String> options) async {
  try {
    // Create poll
    var pollResponse = await dio.post(
      'https://your-worker.dev/api/polls/create',
      data: FormData.fromMap({
        'post_id': postId,
        'question': question,
        'is_multiple': 0, // Single choice
      }),
    );

    String pollId = pollResponse.data['pollId'];

    // Add options
    for (var option in options) {
      await dio.post(
        'https://your-worker.dev/api/polls/options/add',
        data: FormData.fromMap({
          'poll_id': pollId,
          'option_text': option,
        }),
      );
    }

    print('Poll created with ${ options.length} options');
  } catch (e) {
    print('Error: $e');
  }
}
```

### 2.5 View Story and Track Views

**Dart Code:**
```dart
Future<void> viewStory(String storyId, String userId) async {
  try {
    // Track view
    await dio.post(
      'https://your-worker.dev/api/stories/view',
      data: FormData.fromMap({
        'story_id': storyId,
        'user_id': userId,
      }),
    );

    print('Story view tracked');
  } catch (e) {
    print('Error: $e');
  }
}

Future<List<String>> getStoryViewers(String storyId) async {
  try {
    var response = await dio.get(
      'https://your-worker.dev/api/stories/$storyId/viewers',
    );

    List<String> viewers = (response.data['viewers'] as List)
        .map((v) => v['user_id'] as String)
        .toList();

    return viewers;
  } catch (e) {
    print('Error: $e');
    return [];
  }
}
```

---

## 🔑 KEY FEATURES

### Posts & Reels
- ✅ Create posts with optional video
- ✅ Automatic video processing
- ✅ Track views, likes, comments
- ✅ Public/private visibility
- ✅ Reel metadata (duration, resolution)

### Stories
- ✅ Auto-expire after 24 hours
- ✅ Track viewers
- ✅ Support image and video
- ✅ Captions

### Groups
- ✅ Create public/private groups
- ✅ Manage members
- ✅ Group-specific posts

### Thoughts
- ✅ Short text content (like tweets)
- ✅ Reply, like, repost
- ✅ Thread management

### Polls
- ✅ Single or multiple choice
- ✅ Auto-expiring polls
- ✅ Vote tracking
- ✅ Real-time results

---

## 📊 DATABASE SCHEMA AT A GLANCE

### Main Tables
```
posts (id, user_id, type, caption, visibility, counts, timestamps)
reels (id, post_id, video_url, duration, audio, counts)
stories (id, user_id, media_url, caption, expires_at)
groups (id, name, created_by, is_private, members)
thoughts (id, post_id, text, counts)
polls (id, post_id, question, options, votes)
```

### Support Tables
```
story_views - Track who viewed stories
group_members - Track group membership
poll_options - Poll choices
poll_votes - Vote tracking
notifications - User notifications
conversations - Chat conversations
messages - Chat messages
calls - Voice/video calls
```

---

## 🚦 TYPICAL WORKFLOW

### 1. User Posts Reel
```
POST /api/posts/create (type: 'reel')
  ↓
Reel auto-created with video metadata
  ↓
POST /api/posts/view (increment views)
  ↓
POST /api/social/like (if user likes)
  ↓
POST /api/thoughts/create (add comment)
```

### 2. User Creates Story
```
POST /api/stories/create
  ↓
Story stored in database
  ↓
Auto-expires after 24 hours
  ↓
POST /api/stories/view (track viewers)
```

### 3. User Creates Poll
```
POST /api/polls/create
  ↓
POST /api/polls/options/add (multiple times)
  ↓
POST /api/polls/vote (users vote)
  ↓
GET /api/polls/{id} (see results)
```

---

## 🔄 MIGRATION GUIDE (From Old Schema)

### Column Name Changes
```
OLD                    →    NEW
postId                 →    id
userId                 →    user_id
userImage             →    (in separate user table)
isVerified            →    (in separate user table)
mediaUrl              →    video_url (in reels table)
thumbnailUrl          →    thumbnail_url (in reels table)
content               →    caption (in posts table)
likeCount             →    like_count
commentCount          →    comment_count
repostCount           →    share_count
viewsCount            →    view_count
timestamp             →    created_at
updatedAt             →    updated_at
```

### New Separated Tables
```
OLD: Everything in posts table
NEW: 
  - posts (basic metadata)
  - reels (video details)
  - stories (story-specific)
  - groups (group functionality)
  - thoughts (comments/short text)
  - polls (voting)
```

---

## 🔐 AUTHENTICATION

All endpoints should include:
```
Headers:
  - Authorization: Bearer <token>  (if implemented)
  - Content-Type: multipart/form-data (for file uploads)
```

---

## ✅ TESTING CHECKLIST

```
□ Create post with caption
□ Upload reel with video
□ Get feed posts (paginated)
□ View post details with reel info
□ Update post caption
□ Delete post
□ Create story (image)
□ Create story (video)
□ Track story views
□ Create group
□ Add group member
□ Create thought/comment
□ Create poll
□ Vote on poll
□ Get poll results
□ Get notifications
□ Send message
□ Create conversation
```

---

## 🐛 ERROR HANDLING

All endpoints return either:

**Success:**
```json
{
  "success": true,
  "data": {...}
}
```

**Error:**
```json
{
  "error": "Error message",
  "status": 400
}
```

---

## 📚 ADDITIONAL RESOURCES

- **Full API Docs:** [API_DOCUMENTATION_NEW.md](API_DOCUMENTATION_NEW.md)
- **Database Schema:** [GEMINI_SUMMARY.md](GEMINI_SUMMARY.md)
- **Backend Code:** `/src/index.js`
- **Database Helpers:** `/src/database/db.js`

---

## 🚀 DEPLOYMENT

```bash
# Deploy to Cloudflare Workers
wrangler deploy

# View logs
wrangler tail

# Test locally
wrangler dev
```

---

**Ready to integrate!** 🎉  
**Last Updated:** April 21, 2026  
**Version:** 2.0 (NEW SCHEMA)
