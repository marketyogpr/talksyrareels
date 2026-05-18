# Advanced Features & Algorithm Guide

Complete guide for TalkSyra Reels advanced features, feed algorithm, analytics, and recommendations system.

## Table of Contents
1. [Advanced Tables Overview](#advanced-tables-overview)
2. [Feed Algorithm Architecture](#feed-algorithm-architecture)
3. [Analytics System](#analytics-system)
4. [Recommendation Engine](#recommendation-engine)
5. [Trending System](#trending-system)
6. [Implementation Guide](#implementation-guide)

---

## Advanced Tables Overview

### 16 New Advanced Tables Added

#### 1. **HASHTAGS** (Table #25)
Tracks all hashtags used across the platform.

**Purpose:** Search, trending, categorization
**Key Fields:**
- `tag_name` - Hashtag name
- `post_count` - Number of posts using this tag
- `trending_score` - Algorithm score for trending
- `is_trending` - Boolean for trending status

**Use Cases:**
```sql
-- Find trending hashtags
SELECT * FROM hashtags 
WHERE is_trending = TRUE 
ORDER BY trending_score DESC 
LIMIT 10;
```

---

#### 2. **POST_HASHTAGS** (Table #26)
Relationship table between posts and hashtags.

**Purpose:** Link posts to multiple hashtags
**Key Fields:**
- `post_id` - References posts
- `hashtag_id` - References hashtags

**Use Cases:**
```sql
-- Get all posts for a hashtag
SELECT p.* FROM posts p
JOIN post_hashtags ph ON p.id = ph.post_id
JOIN hashtags h ON ph.hashtag_id = h.id
WHERE h.slug = 'talksyra' 
ORDER BY p.created_at DESC;
```

---

#### 3. **USER_INTERESTS** (Table #27)
Personalized interests/categories for each user.

**Purpose:** Personalization, algorithm targeting
**Key Fields:**
- `user_id` - User reference
- `interest_name` - Category (tech, sports, music, etc.)
- `interest_score` - Weight/importance (0-1)

**Use Cases:**
```sql
-- Get user's top interests
SELECT * FROM user_interests 
WHERE user_id = 'user-uuid' 
ORDER BY interest_score DESC 
LIMIT 5;

-- Update interest score based on engagement
UPDATE user_interests 
SET interest_score = interest_score + 0.1 
WHERE user_id = 'user-uuid' 
AND interest_name = 'technology';
```

---

#### 4. **FEED_RANKING_SCORES** (Table #28)
Algorithm scores for ranking posts in user's feed.

**Purpose:** Feed personalization, ranking
**Key Fields:**
- `user_id` - User receiving feed
- `post_id` - Post being ranked
- `engagement_score` - Based on post engagement (0-1)
- `recency_score` - Based on post age (0-1)
- `relevance_score` - User interest match (0-1)
- `personalization_score` - User behavior match (0-1)
- `total_score` - Final ranking score
- `rank_position` - Position in user's feed

**Algorithm Formula:**
```
total_score = (
  engagement_score * 0.35 +
  recency_score * 0.25 +
  relevance_score * 0.25 +
  personalization_score * 0.15
)
```

**Use Cases:**
```sql
-- Get top 20 posts for user's feed
SELECT post_id FROM feed_ranking_scores
WHERE user_id = 'user-uuid' 
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY total_score DESC 
LIMIT 20;
```

---

#### 5. **ENGAGEMENT_ANALYTICS** (Table #29)
Detailed engagement metrics for posts.

**Purpose:** Post performance tracking, analytics
**Key Fields:**
- `post_id` - Post reference
- `total_views`, `total_likes`, `total_comments`, `total_shares`, `total_saves`
- `engagement_rate` - (total_engagement / total_views)
- `last_hour_views`, `last_24h_views`, `last_7d_views`
- `avg_engagement_per_hour` - For trending calculation

**Use Cases:**
```sql
-- Get high-performing posts
SELECT * FROM engagement_analytics
WHERE engagement_rate > 0.1 
ORDER BY total_views DESC;

-- Get viral growth posts (increasing views)
SELECT * FROM engagement_analytics
WHERE last_24h_views > (last_7d_views / 7) * 2;
```

---

#### 6. **USER_ANALYTICS** (Table #30)
Performance metrics for each user.

**Purpose:** Creator analytics, growth tracking
**Key Fields:**
- `user_id` - User reference
- `total_posts`, `total_followers`, `total_following`
- `avg_post_engagement` - Average engagement per post
- `growth_rate` - Follower growth rate
- `engagement_rate` - (total_engagement / total_followers)
- `last_post_at`, `last_activity_at`

**Use Cases:**
```sql
-- Get top creators
SELECT * FROM user_analytics
ORDER BY avg_post_engagement DESC 
LIMIT 10;

-- Get inactive users
SELECT * FROM user_analytics
WHERE last_activity_at < NOW() - INTERVAL '7 days';
```

---

#### 7. **TRENDING_POSTS** (Table #31)
Posts currently trending on the platform.

**Purpose:** Explore feed, trending section
**Key Fields:**
- `post_id` - Post reference
- `trending_score` - Algorithm score
- `trending_rank` - Position in trending list
- `category` - Content category
- `expires_at` - 24-hour expiration

**Use Cases:**
```sql
-- Get trending posts in category
SELECT * FROM trending_posts
WHERE category = 'music' 
AND is_trending = TRUE
ORDER BY trending_rank ASC 
LIMIT 20;

-- Remove expired trending posts
DELETE FROM trending_posts
WHERE expires_at < NOW();
```

---

#### 8. **RECOMMENDATIONS** (Table #32)
Personalized user and content recommendations.

**Purpose:** Follow suggestions, content discovery
**Key Fields:**
- `user_id` - User receiving recommendation
- `recommended_user_id` - Suggested user to follow
- `post_id` - Recommended post (optional)
- `recommendation_type` - 'user', 'content', 'hashtag'
- `confidence_score` - 0-1 confidence level
- `reason` - Why recommended
- `interacted_at` - When user interacted

**Use Cases:**
```sql
-- Get recommendations for user
SELECT * FROM recommendations
WHERE user_id = 'user-uuid' 
AND confidence_score > 0.7
ORDER BY confidence_score DESC;

-- Track recommendation engagement
UPDATE recommendations
SET interacted_at = NOW()
WHERE user_id = 'user-uuid' 
AND recommended_user_id = 'rec-user-uuid';
```

---

#### 9. **USER_ACTIVITY_LOG** (Table #33)
Tracks all user activities for analytics.

**Purpose:** Analytics, behavior tracking
**Key Fields:**
- `user_id` - User
- `activity_type` - 'view', 'like', 'comment', 'follow', 'share', etc.
- `post_id`, `target_user_id` - References
- `metadata` - JSON additional data

**Use Cases:**
```sql
-- Get user's activity summary
SELECT activity_type, COUNT(*) as count
FROM user_activity_log
WHERE user_id = 'user-uuid'
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY activity_type;

-- Find what users are engaging with
SELECT activity_type, post_id, COUNT(*)
FROM user_activity_log
WHERE activity_type = 'like'
GROUP BY activity_type, post_id
ORDER BY count DESC;
```

---

#### 10. **DEVICE_INFO** (Table #34)
Device and platform information for users.

**Purpose:** Analytics, crash reporting, OS tracking
**Key Fields:**
- `user_id` - User
- `device_id` - Unique device identifier
- `device_type` - 'mobile', 'tablet', 'web'
- `os_type` - 'iOS', 'Android', 'Windows'
- `os_version`, `app_version`
- `last_active` - Last activity timestamp

**Use Cases:**
```sql
-- Get app version statistics
SELECT app_version, COUNT(*) as users
FROM device_info
WHERE last_active > NOW() - INTERVAL '7 days'
GROUP BY app_version;

-- Identify problematic OS versions
SELECT os_type, os_version, COUNT(*) as users
FROM device_info
GROUP BY os_type, os_version
ORDER BY users DESC;
```

---

#### 11. **SEARCH_HISTORY** (Table #35)
User search queries and analytics.

**Purpose:** Search analytics, trending searches
**Key Fields:**
- `user_id` - User searching
- `search_query` - Search text
- `search_type` - 'text', 'hashtag', 'user', 'location'
- `result_count` - Number of results found

**Use Cases:**
```sql
-- Find trending searches
SELECT search_query, COUNT(*) as searches
FROM search_history
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY search_query
ORDER BY searches DESC
LIMIT 20;

-- Get user's search history
SELECT * FROM search_history
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 20;
```

---

#### 12. **CONTENT_MODERATION_QUEUE** (Table #36)
Content moderation workflow management.

**Purpose:** Moderation management, safety
**Key Fields:**
- `report_id`, `post_id`, `user_id` - References
- `violation_type` - 'spam', 'hate_speech', 'explicit', 'harassment'
- `severity` - 'low', 'medium', 'high', 'critical'
- `status` - 'pending', 'reviewing', 'resolved'
- `assigned_to` - Moderator UUID
- `action_taken` - 'approved', 'rejected', 'removed', 'warned'

**Use Cases:**
```sql
-- Get pending high-severity reports
SELECT * FROM content_moderation_queue
WHERE status = 'pending' 
AND severity IN ('high', 'critical')
ORDER BY created_at ASC;

-- Get moderator's workload
SELECT assigned_to, COUNT(*) as tasks, 
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
FROM content_moderation_queue
WHERE assigned_to IS NOT NULL
GROUP BY assigned_to;
```

---

#### 13. **USER_PREFERENCES** (Table #37)
User algorithm and content preferences.

**Purpose:** Personalization, content filtering
**Key Fields:**
- `user_id` - User
- `feed_algorithm` - 'personalized', 'chronological', 'trending'
- `content_quality_threshold` - 0-1 minimum quality score
- `enable_recommendations`, `enable_trending` - Boolean flags
- `max_ads_per_feed` - Ad frequency
- `language` - Preferred language
- `content_filter` - Array of blocked keywords

**Use Cases:**
```sql
-- Respect user preferences in feed
SELECT * FROM feed_ranking_scores f
JOIN user_preferences p ON f.user_id = p.user_id
WHERE f.user_id = 'user-uuid'
AND (
  CASE WHEN p.feed_algorithm = 'chronological'
  THEN f.rank_position <= 50
  ELSE f.total_score > p.content_quality_threshold
  END
)
ORDER BY f.total_score DESC;
```

---

#### 14. **FEED_CACHE** (Table #38)
Cached feed results for performance.

**Purpose:** Performance optimization, reduced queries
**Key Fields:**
- `user_id` - User
- `feed_type` - 'home', 'explore', 'trending', 'following'
- `cached_posts` - JSONB array of post data
- `expires_at` - Cache expiration (1 hour default)

**Use Cases:**
```sql
-- Check if feed cache exists and is valid
SELECT cached_posts FROM feed_cache
WHERE user_id = 'user-uuid' 
AND feed_type = 'home'
AND expires_at > NOW();

-- Invalidate user's cache on new post
DELETE FROM feed_cache
WHERE user_id = 'user-uuid' 
OR (
  feed_type = 'explore' 
  AND expires_at > NOW()
);
```

---

#### 15. **POST_VIEWS_TIMELINE** (Table #39)
Detailed view analytics for video/reels.

**Purpose:** Watch time analytics, retention
**Key Fields:**
- `post_id` - Post (video/reel)
- `viewer_id` - User watching
- `view_duration` - Seconds watched
- `completed` - Boolean (watched >= 80%)

**Use Cases:**
```sql
-- Get average watch time for post
SELECT AVG(view_duration) as avg_watch,
  COUNT(CASE WHEN completed THEN 1 END)::float / COUNT(*) * 100 as completion_rate
FROM post_views_timeline
WHERE post_id = 'post-uuid';

-- Find highly watched posts
SELECT post_id, AVG(view_duration) as avg_watch
FROM post_views_timeline
GROUP BY post_id
HAVING AVG(view_duration) > 30
ORDER BY avg_watch DESC;
```

---

#### 16. **COINS_TRANSACTION_LOG** (Table #40)
Detailed coin transaction history.

**Purpose:** Monetization tracking, audit trail
**Key Fields:**
- `user_id` - User
- `coin_type` - 'red_coins', 'green_coins'
- `amount` - Transaction amount
- `reason` - 'post_like', 'post_share', 'ad_view', 'purchase', 'gift', etc.
- `reference_id`, `reference_type` - What triggered it
- `balance_before`, `balance_after` - Coin balance change

**Use Cases:**
```sql
-- Get coin earnings breakdown
SELECT reason, SUM(amount) as total, COUNT(*) as transactions
FROM coins_transaction_log
WHERE user_id = 'user-uuid'
AND coin_type = 'green_coins'
AND created_at > NOW() - INTERVAL '30 days'
GROUP BY reason
ORDER BY total DESC;

-- Track suspicious activity
SELECT user_id, SUM(amount) as total
FROM coins_transaction_log
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING SUM(amount) > 1000
ORDER BY total DESC;
```

---

## Feed Algorithm Architecture

### Algorithm Overview

The TalkSyra feed algorithm uses a **hybrid approach** combining multiple factors:

```
TOTAL SCORE = (engagement_score × 0.35) + (recency_score × 0.25) + 
              (relevance_score × 0.25) + (personalization_score × 0.15)
```

### Component Scoring

#### 1. **Engagement Score (35%)**
Measures how users interact with the post.

```
engagement_score = (
  (likes / views) * 0.4 +
  (comments / views) * 0.4 +
  (shares / views) * 0.2
) / max_engagement_rate
```

**Capped at 1.0, normalized**

#### 2. **Recency Score (25%)**
Prioritizes newer content.

```
hours_old = (NOW() - post.created_at) / 3600
recency_score = MAX(0, 1 - (hours_old / 72))
```

**Decays over 72 hours**

#### 3. **Relevance Score (25%)**
Matches post to user interests.

```
relevance_score = 0
FOR EACH post_tag IN post.hashtags:
  FOR EACH user_interest IN user.interests:
    IF post_tag ~= user_interest:
      relevance_score += user_interest.score

relevance_score = MIN(1.0, relevance_score)
```

#### 4. **Personalization Score (15%)**
Based on user behavior patterns.

```
personalization_score = (
  (follows_poster * 0.5) +
  (engages_with_poster * 0.3) +
  (similar_interests * 0.2)
) / 1.0
```

### Implementation SQL

```sql
-- Calculate feed for user
WITH post_scores AS (
  SELECT 
    p.id,
    -- Engagement Score
    (
      (COALESCE(ea.total_likes, 0)::FLOAT / 
       NULLIF(ea.total_views, 0) * 0.4) +
      (COALESCE(ea.total_comments, 0)::FLOAT / 
       NULLIF(ea.total_views, 0) * 0.4) +
      (COALESCE(ea.total_shares, 0)::FLOAT / 
       NULLIF(ea.total_views, 0) * 0.2)
    ) as engagement_score,
    
    -- Recency Score
    CASE 
      WHEN EXTRACT(EPOCH FROM (NOW() - p.created_at))/3600 < 72 THEN
        GREATEST(0, 1 - (EXTRACT(EPOCH FROM (NOW() - p.created_at))/3600 / 72))
      ELSE 0
    END as recency_score,
    
    -- Relevance Score (simplified)
    CASE WHEN EXISTS (
      SELECT 1 FROM user_interests ui
      JOIN post_hashtags ph ON TRUE
      WHERE ui.user_id = $1 
      AND ui.interest_name ILIKE ANY(p.hashtags)
    ) THEN 0.8 ELSE 0.2 END as relevance_score,
    
    -- Personalization Score
    CASE 
      WHEN p.user_id IN (SELECT following_id FROM followers WHERE follower_id = $1) THEN 0.7
      WHEN EXISTS (
        SELECT 1 FROM likes WHERE user_id = $1 AND post_id IN (
          SELECT id FROM posts WHERE user_id = p.user_id
        )
      ) THEN 0.5
      ELSE 0.1
    END as personalization_score
    
  FROM posts p
  LEFT JOIN engagement_analytics ea ON p.id = ea.post_id
  WHERE p.visibility = 'public'
  AND p.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = $1)
)

SELECT * FROM post_scores
ORDER BY (
  engagement_score * 0.35 +
  recency_score * 0.25 +
  relevance_score * 0.25 +
  personalization_score * 0.15
) DESC
LIMIT 20;
```

---

## Analytics System

### Key Metrics

#### User Analytics
```sql
-- Daily Active Users (DAU)
SELECT DATE(last_activity_at) as date, COUNT(DISTINCT user_id) as dau
FROM user_analytics
WHERE last_activity_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(last_activity_at);

-- Monthly Active Users (MAU)
SELECT COUNT(DISTINCT user_id) as mau
FROM user_analytics
WHERE last_activity_at > NOW() - INTERVAL '30 days';
```

#### Content Analytics
```sql
-- Posts per day
SELECT DATE(created_at) as date, COUNT(*) as posts_count
FROM posts
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at);

-- Average engagement per post
SELECT AVG(engagement_rate) as avg_engagement
FROM engagement_analytics;
```

#### Platform Health
```sql
-- Content moderation ratio
SELECT 
  COUNT(*) as total_reports,
  COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
  ROUND(100.0 * COUNT(CASE WHEN status = 'resolved' THEN 1 END) / 
        COUNT(*), 2) as resolution_rate
FROM content_moderation_queue;
```

---

## Recommendation Engine

### Types of Recommendations

1. **User Recommendations** - Who to follow
2. **Content Recommendations** - Posts to view
3. **Hashtag Recommendations** - Trending topics

### Algorithm

```sql
-- Generate user recommendations
INSERT INTO recommendations (user_id, recommended_user_id, recommendation_type, confidence_score)
SELECT DISTINCT
  $1 as user_id,
  u.id as recommended_user_id,
  'user' as recommendation_type,
  (
    (shared_followers_count::FLOAT / total_followers) * 0.4 +
    (shared_interests_count::FLOAT / GREATEST(user_interests, 1)) * 0.4 +
    (mutual_likes_count::FLOAT / 100) * 0.2
  ) as confidence_score
FROM users u
CROSS JOIN LATERAL (
  SELECT 
    COUNT(DISTINCT f1.follower_id) as shared_followers_count,
    COUNT(DISTINCT f.follower_id) as total_followers,
    COUNT(DISTINCT CASE WHEN ui.interest_name = ui2.interest_name THEN 1 END) as shared_interests_count,
    COUNT(DISTINCT ui.interest_name) as user_interests,
    COUNT(DISTINCT CASE WHEN l1.post_id = l2.post_id THEN 1 END) as mutual_likes_count
  FROM followers f
  LEFT JOIN followers f1 ON f1.following_id = u.id AND f1.follower_id IN (
    SELECT follower_id FROM followers WHERE following_id = $1
  )
  LEFT JOIN user_interests ui ON ui.user_id = $1
  LEFT JOIN user_interests ui2 ON ui2.user_id = u.id
  LEFT JOIN likes l1 ON l1.user_id = $1
  LEFT JOIN likes l2 ON l2.user_id = u.id
  WHERE f.follower_id = $1
) stats
WHERE u.id NOT IN (SELECT following_id FROM followers WHERE follower_id = $1)
AND u.id != $1
AND confidence_score > 0.3
LIMIT 10;
```

---

## Trending System

### Trending Algorithm

Posts trend based on:
1. **Velocity** - How fast engagement is growing
2. **Volume** - Total engagement amount
3. **Recency** - Recent engagement weighted more

```
trending_score = (velocity * 0.4) + (normalized_volume * 0.4) + (recency * 0.2)
```

### Implementation

```sql
-- Update trending scores every hour
UPDATE trending_posts
SET trending_score = (
  -- Velocity: growth rate
  ((last_24h_views - (last_7d_views / 7)) / GREATEST(last_7d_views / 7, 1)) * 0.4 +
  -- Volume: normalized engagement
  (LEAST(ea.total_engagement / 10000.0, 1.0) * 0.4) +
  -- Recency: recent > old
  (GREATEST(0, 1 - (EXTRACT(EPOCH FROM (NOW() - tp.created_at)) / 86400)) * 0.2)
)
FROM engagement_analytics ea
WHERE tp.post_id = ea.post_id
AND tp.expires_at > NOW();

-- Update trending ranks
UPDATE trending_posts
SET trending_rank = rank
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY trending_score DESC) as rank
  FROM trending_posts
  WHERE expires_at > NOW() AND is_trending = TRUE
) ranked
WHERE trending_posts.id = ranked.id;
```

---

## Implementation Guide

### Backend Integration Steps

1. **Database Setup**
   - Run SUPABASE_SETUP.sql to create all tables
   - Verify all 40 tables are created

2. **Insert Sample Data**
   ```sql
   -- Create sample users
   INSERT INTO users (username, email) VALUES ('user1', 'user1@example.com');
   
   -- Create sample posts
   INSERT INTO posts (user_id, caption, visibility) VALUES ($1, 'Hello World', 'public');
   ```

3. **Implement Feed Algorithm**
   - Use the SQL query provided above
   - Calculate scores in background job (every 30 minutes)
   - Cache results in feed_cache table

4. **Enable Real-time Updates**
   - Supabase → Realtime → Enable for tables:
     - posts, likes, comments, followers
     - notifications, messages

5. **Set Up Analytics Jobs**
   - Hourly: Update engagement_analytics
   - Daily: Update user_analytics, trending_posts
   - Weekly: Generate recommendations

6. **Implement Moderation**
   - Auto-flag content using ML models
   - Route to content_moderation_queue
   - Track actions in activity log

### API Endpoints to Create

```javascript
// Feed endpoint
GET /api/feed?user_id=uuid
// Returns: Top 20 posts ranked by algorithm

// Trending endpoint  
GET /api/trending?category=music
// Returns: Trending posts

// Recommendations endpoint
GET /api/recommendations?user_id=uuid
// Returns: Recommended users/content

// Analytics endpoint
GET /api/analytics/user?user_id=uuid
// Returns: User performance metrics

// Search endpoint
GET /api/search?q=query&type=text|user|hashtag
// Returns: Search results + logs query
```

---

## Summary

The TalkSyra advanced features provide:
- ✅ AI-powered personalized feed
- ✅ Trending content discovery
- ✅ Detailed analytics & insights
- ✅ Content moderation system
- ✅ Recommendation engine
- ✅ Comprehensive activity tracking
- ✅ Performance optimization with caching
- ✅ Monetization tracking

All powered by a robust PostgreSQL + Supabase database with proper indexing and RLS policies!
