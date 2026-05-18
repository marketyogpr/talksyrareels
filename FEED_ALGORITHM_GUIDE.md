# Instagram-like Feed Algorithm - Implementation Guide

Complete guide to integrate the advanced feed algorithm with your Flutter app.

## 📋 Overview

This implementation provides:
- **Personalized Home Feed** - Posts from followed users + recommendations
- **Explore Feed** - Trending content by category
- **Reels Feed** - Infinite scrolling video content
- **Engagement Tracking** - Likes, comments, shares, watch time
- **User Interest Analysis** - Automatic and manual interest tracking
- **Advanced Scoring** - 6-factor ranking algorithm
- **Trending Content** - Real-time trending based on engagement velocity

## 🔧 Setup Steps

### Step 1: Database Setup
1. Copy all SQL from [SUPABASE_SCHEMA.md](SUPABASE_SCHEMA.md)
2. Paste into Supabase SQL Editor
3. Execute to create all tables
4. Enable Row Level Security (RLS) for security

### Step 2: Environment Configuration

Update `wrangler.toml` with Supabase credentials:

```toml
[env.production]
vars = {
  R2_PUBLIC_DOMAIN = "https://r2api.talksyra.app",
  SUPABASE_URL = "your-supabase-url",
  SUPABASE_ANON_KEY = "your-supabase-anon-key"
}

[env.staging]
vars = {
  R2_PUBLIC_DOMAIN = "https://r2api.talksyra.app",
  SUPABASE_URL = "your-staging-supabase-url",
  SUPABASE_ANON_KEY = "your-staging-anon-key"
}
```

### Step 3: Deploy Updated Worker

```bash
npm run deploy:production
# or
npm run deploy:staging
```

## 🎯 API Endpoints

### Feed Endpoints

#### 1. **Get Home Feed** (Personalized)
```http
GET /api/feed/home?user_id=UUID&limit=20&offset=0
```

**Response:**
```json
{
  "success": true,
  "posts": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "caption": "Great day!",
      "media_url": "...",
      "tags": ["motivation", "lifestyle"],
      "created_at": "2024-05-18T10:00:00Z",
      "author": {
        "id": "uuid",
        "username": "user123",
        "avatar": "..."
      },
      "engagement": {
        "likes_count": 150,
        "comments_count": 12,
        "shares_count": 5
      },
      "scoringBreakdown": {
        "engagement": 75.5,
        "recency": 95,
        "interestMatch": 85,
        "connection": 100,
        "watchTime": 0,
        "personalHistory": 60
      }
    }
  ],
  "hasMore": true,
  "total": 245
}
```

#### 2. **Get Explore Feed** (Discover)
```http
GET /api/feed/explore?user_id=UUID&category=photography&limit=30
```

Supported categories: `all`, `photography`, `lifestyle`, `food`, `technology`, `travel`, `art`, etc.

#### 3. **Get Reels Feed** (Video)
```http
GET /api/feed/reels?user_id=UUID&limit=10&lastReelId=optional-uuid
```

**Cursor-based pagination for infinite scroll**

#### 4. **Get Trending Feed**
```http
GET /api/feed/trending?limit=50
```

#### 5. **Get Saved Posts**
```http
GET /api/feed/saved?user_id=UUID&limit=20&offset=0
```

### Engagement Endpoints

#### 1. **Like/Unlike Post**
```http
POST /api/engagement/like
Content-Type: application/json

{
  "user_id": "UUID",
  "post_id": "UUID",
  "is_like": true
}
```

#### 2. **Add Comment**
```http
POST /api/engagement/comment
Content-Type: application/json

{
  "user_id": "UUID",
  "post_id": "UUID",
  "text": "Great content!",
  "parent_comment_id": "optional-uuid-for-replies"
}
```

#### 3. **Share Post**
```http
POST /api/engagement/share
Content-Type: application/json

{
  "user_id": "UUID",
  "post_id": "UUID",
  "method": "whatsapp" // whatsapp, email, direct, copy
}
```

#### 4. **Save/Unsave Post**
```http
POST /api/engagement/save
Content-Type: application/json

{
  "user_id": "UUID",
  "post_id": "UUID",
  "is_save": true
}
```

#### 5. **Track View**
```http
POST /api/engagement/view
Content-Type: application/json

{
  "user_id": "UUID",
  "post_id": "UUID",
  "duration": 3 // seconds user viewed
}
```

#### 6. **Track Watch Time (Reels)**
```http
POST /api/engagement/watch
Content-Type: application/json

{
  "user_id": "UUID",
  "reel_id": "UUID",
  "watch_duration": 8.5, // seconds watched
  "total_duration": 15 // total reel length in seconds
}
```

#### 7. **Report Content**
```http
POST /api/engagement/report
Content-Type: application/json

{
  "user_id": "UUID",
  "post_id": "UUID",
  "reason": "inappropriate", // inappropriate, spam, hate_speech, violence
  "details": "Additional details"
}
```

#### 8. **Block User**
```http
POST /api/engagement/block
Content-Type: application/json

{
  "user_id": "UUID",
  "blocked_user_id": "UUID"
}
```

### Stats Endpoints

#### 1. **Get User Engagement Stats**
```http
GET /api/stats/user-engagement?user_id=UUID
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 1250,
    "likes": 450,
    "comments": 300,
    "shares": 120,
    "views": 280,
    "saves": 100
  }
}
```

#### 2. **Get Post Stats**
```http
GET /api/stats/post?post_id=UUID
```

#### 3. **Get Trending Stats**
```http
GET /api/stats/trending?limit=20
```

### Interest Endpoints

#### 1. **Get User Interests**
```http
GET /api/interests/get?user_id=UUID
```

**Response:**
```json
{
  "success": true,
  "interests": ["photography", "travel", "motivation", "tech"]
}
```

#### 2. **Update User Interests**
```http
POST /api/interests/update
Content-Type: application/json

{
  "user_id": "UUID",
  "interests": ["photography", "travel", "food", "art"]
}
```

#### 3. **Get Interest Suggestions**
```http
GET /api/interests/suggestions?user_id=UUID
```

### Recommendation Endpoints

#### 1. **Get Discover Recommendations**
```http
GET /api/recommendations/discover?user_id=UUID&limit=20
```

#### 2. **Get Similar Posts**
```http
GET /api/recommendations/similar?post_id=UUID&user_id=UUID&limit=10
```

## 📱 Flutter Integration Example

### 1. Create Supabase Service
```dart
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  static final SupabaseClient _client = Supabase.instance.client;

  static Future<void> initialize() async {
    await Supabase.initialize(
      url: 'YOUR_SUPABASE_URL',
      anonKey: 'YOUR_SUPABASE_ANON_KEY',
    );
  }

  static SupabaseClient get client => _client;
}
```

### 2. Create Feed Service
```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class FeedService {
  final String _baseUrl = 'https://api.buyviro.com'; // Your worker URL
  final String _userId;

  FeedService(this._userId);

  // Get Home Feed
  Future<List<Post>> getHomeFeed({int limit = 20, int offset = 0}) async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/api/feed/home?user_id=$_userId&limit=$limit&offset=$offset'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return (data['posts'] as List)
            .map((post) => Post.fromJson(post))
            .toList();
      }
      throw Exception('Failed to load feed');
    } catch (e) {
      print('Error: $e');
      return [];
    }
  }

  // Get Reels Feed
  Future<List<Reel>> getReelsFeed({int limit = 10, String? lastReelId}) async {
    try {
      String url = '$_baseUrl/api/feed/reels?user_id=$_userId&limit=$limit';
      if (lastReelId != null) {
        url += '&lastReelId=$lastReelId';
      }

      final response = await http.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return (data['reels'] as List)
            .map((reel) => Reel.fromJson(reel))
            .toList();
      }
      throw Exception('Failed to load reels');
    } catch (e) {
      print('Error: $e');
      return [];
    }
  }

  // Like Post
  Future<bool> likePost(String postId, {bool isLike = true}) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/api/engagement/like'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'user_id': _userId,
          'post_id': postId,
          'is_like': isLike,
        }),
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Error: $e');
      return false;
    }
  }

  // Track View
  Future<bool> trackView(String postId, {int duration = 0}) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/api/engagement/view'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'user_id': _userId,
          'post_id': postId,
          'duration': duration,
        }),
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Error: $e');
      return false;
    }
  }

  // Track Reel Watch Time
  Future<bool> trackReelWatchTime(
    String reelId,
    double watchDuration,
    double totalDuration,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/api/engagement/watch'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'user_id': _userId,
          'reel_id': reelId,
          'watch_duration': watchDuration,
          'total_duration': totalDuration,
        }),
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Error: $e');
      return false;
    }
  }

  // Save Post
  Future<bool> savePost(String postId, {bool isSave = true}) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/api/engagement/save'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'user_id': _userId,
          'post_id': postId,
          'is_save': isSave,
        }),
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Error: $e');
      return false;
    }
  }

  // Get User Interests
  Future<List<String>> getUserInterests() async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/api/interests/get?user_id=$_userId'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return List<String>.from(data['interests'] ?? []);
      }
      throw Exception('Failed to load interests');
    } catch (e) {
      print('Error: $e');
      return [];
    }
  }

  // Update User Interests
  Future<bool> updateUserInterests(List<String> interests) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/api/interests/update'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'user_id': _userId,
          'interests': interests,
        }),
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Error: $e');
      return false;
    }
  }
}
```

### 3. Create Feed Widget
```dart
import 'package:flutter/material.dart';

class FeedPage extends StatefulWidget {
  @override
  _FeedPageState createState() => _FeedPageState();
}

class _FeedPageState extends State<FeedPage> {
  late FeedService _feedService;
  List<Post> _posts = [];
  bool _isLoading = false;
  int _offset = 0;

  @override
  void initState() {
    super.initState();
    _feedService = FeedService(SupabaseService.client.auth.currentUser!.id);
    _loadHomeFeed();
  }

  Future<void> _loadHomeFeed() async {
    setState(() => _isLoading = true);
    
    final posts = await _feedService.getHomeFeed(offset: _offset);
    
    setState(() {
      if (_offset == 0) {
        _posts = posts;
      } else {
        _posts.addAll(posts);
      }
      _isLoading = false;
    });
  }

  void _loadMore() {
    _offset += 20;
    _loadHomeFeed();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Home Feed')),
      body: _isLoading && _posts.isEmpty
          ? Center(child: CircularProgressIndicator())
          : ListView.builder(
              itemCount: _posts.length + 1,
              itemBuilder: (context, index) {
                if (index == _posts.length) {
                  return Center(
                    child: ElevatedButton(
                      onPressed: _loadMore,
                      child: Text('Load More'),
                    ),
                  );
                }

                final post = _posts[index];
                return PostCard(
                  post: post,
                  feedService: _feedService,
                );
              },
            ),
    );
  }
}

class PostCard extends StatefulWidget {
  final Post post;
  final FeedService feedService;

  const PostCard({required this.post, required this.feedService});

  @override
  _PostCardState createState() => _PostCardState();
}

class _PostCardState extends State<PostCard> {
  late bool _isLiked;

  @override
  void initState() {
    super.initState();
    _isLiked = false;
    widget.feedService.trackView(widget.post.id);
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.all(8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // User Info
          Padding(
            padding: EdgeInsets.all(8),
            child: Row(
              children: [
                CircleAvatar(backgroundImage: NetworkImage(widget.post.author.avatar)),
                SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(widget.post.author.username, style: TextStyle(fontWeight: FontWeight.bold)),
                    Text('${widget.post.createdAt}', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
              ],
            ),
          ),
          // Image/Media
          if (widget.post.mediaUrl != null)
            Image.network(widget.post.mediaUrl!, fit: BoxFit.cover, width: double.infinity, height: 300),
          // Caption
          Padding(
            padding: EdgeInsets.all(8),
            child: Text(widget.post.caption),
          ),
          // Engagement
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                IconButton(
                  icon: Icon(_isLiked ? Icons.favorite : Icons.favorite_border),
                  onPressed: () {
                    setState(() => _isLiked = !_isLiked);
                    widget.feedService.likePost(widget.post.id, isLike: _isLiked);
                  },
                ),
                IconButton(icon: Icon(Icons.comment_outlined), onPressed: () {}),
                IconButton(icon: Icon(Icons.share_outlined), onPressed: () {}),
                IconButton(icon: Icon(Icons.bookmark_border), onPressed: () {
                  widget.feedService.savePost(widget.post.id);
                }),
              ],
            ),
          ),
          // Stats
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            child: Text(
              '${widget.post.engagement.likesCount} likes • ${widget.post.engagement.commentsCount} comments',
              style: TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}
```

## 🔐 Security Considerations

1. **Always validate user_id** on the backend
2. **Use RLS policies** in Supabase to prevent unauthorized access
3. **Rate limit API calls** to prevent abuse
4. **Sanitize user inputs** before storing
5. **Use HTTPS** for all API calls
6. **Token refresh** - Implement token rotation

## 📊 Performance Optimization

1. **Lazy Loading** - Load posts only when needed
2. **Caching** - Cache engagement metrics locally
3. **Pagination** - Use offset/limit for large datasets
4. **Database Indexes** - All important queries are indexed
5. **CDN** - Serve media through Cloudflare R2

## 🐛 Troubleshooting

### Feed not loading?
- Check Supabase credentials in `wrangler.toml`
- Verify database tables are created
- Check network requests in browser dev tools

### Slow performance?
- Verify indexes are created
- Check database query performance
- Enable caching on Cloudflare

### Engagement not tracking?
- Verify engagement table exists
- Check user_id is being sent correctly
- Review Supabase logs

## 📈 Next Steps

1. Set up analytics dashboard
2. Implement A/B testing for algorithm improvements
3. Add recommendation ML model
4. Implement hashtag trending system
5. Add user cohort analysis

## 📞 Support

For issues or questions:
- Check error logs in Cloudflare dashboard
- Review Supabase database logs
- Debug with Wrangler: `wrangler tail`
