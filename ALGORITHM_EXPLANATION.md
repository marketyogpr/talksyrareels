# Advanced Feed Algorithm - Complete Technical Explanation

## 📊 Algorithm Architecture

The feed algorithm uses a **multi-factor ranking system** inspired by Instagram, TikTok, and YouTube recommendation engines. It combines 6 weighted scoring factors to create personalized feeds.

## 🎯 Ranking Factors (6-Factor Model)

### 1. **Engagement Score** (30%)
Measures how much interaction a post receives relative to the creator's follower count.

**Formula:**
```
Engagement Score = (Likes + Comments×2 + Shares×3) / (Creator's Followers) × 100
Normalized to 0-100 scale (5% engagement rate = 100)
```

**Why?** Posts with high engagement are more likely to be interesting to others.

**Example:**
- Post with 100 likes from account with 1000 followers = 10% engagement = HIGH SCORE
- Post with 100 likes from account with 100,000 followers = 0.1% engagement = LOW SCORE

---

### 2. **Recency Score** (15%)
Newer content gets higher priority, but doesn't completely disappear over time.

**Formula:**
```
Days Old    |  Score
≤ 1 day     |  100
≤ 2 days    |  85
≤ 3 days    |  70
≤ 7 days    |  50
> 7 days    |  50 × e^(-days/7)  [Exponential decay]
```

**Why?** Fresh content is more relevant and time-sensitive.

---

### 3. **User Interest Match** (25%)
How well a post's content aligns with the user's interests and past behavior.

**Formula:**
```
Interest Score = (Matched Topics / Total User Interests) × 100
```

**Sources of Interests:**
- Explicit: User-selected interests in profile
- Implicit: Content tags from posts they've liked/commented on
- Inferred: Similar content to what they engage with most

**Example:**
- User interested in: [photography, travel, food]
- Post tags: [photography, sunset, mountain] → 67% match
- Post tags: [gaming, tech] → 0% match

---

### 4. **Social Connection Boost** (15%)
Posts from followed accounts get a significant boost; verified creators also get priority.

**Formula:**
```
If user follows creator: 100
If creator is verified: 70
Otherwise: 0
```

**Why?** Users prioritize content from people they follow.

---

### 5. **Watch Time** (10%)
For video content (reels), measures how long users actually watch.

**Formula:**
```
Watch Time Score = (Average Watch Duration / Total Video Length) × 100
Based on last 100 video views
```

**Example:**
- 15-second reel, users watch average of 12 seconds = 80% score
- 15-second reel, users watch average of 3 seconds = 20% score

---

### 6. **Personal History Match** (5%)
Based on user's past interaction patterns with similar content.

**Formula:**
```
If similar to past liked content: 60-80
If similar to past commented content: 70-90
If similar to past saved content: 80-100
```

---

## 🧮 Combined Ranking Formula

```
Final Score = (E × 0.30) + (R × 0.15) + (I × 0.25) + (C × 0.15) + (W × 0.10) + (H × 0.05)

Where:
E = Engagement Score (0-100)
R = Recency Score (0-100)
I = Interest Match Score (0-100)
C = Connection Score (0-100)
W = Watch Time Score (0-100)
H = Personal History Score (0-100)

Final Score Range: 0-100
```

---

## 🎯 Feed Types

### 1. **Home Feed** (Personalized)
- 60% from followed users (sorted by score)
- 40% from recommendations (interest-based)
- Updated every time user opens app
- Removes blocked users and already viewed posts

**Scoring Priority:**
1. Social connection (followed accounts)
2. User interests
3. Engagement metrics
4. Recent content

### 2. **Explore Feed** (Discovery)
- Shows trending content from different categories
- Calculated by: `Engagement Velocity` (engagements in last hour / engagements in last 6 hours)
- Excludes posts from followed users and own posts
- Updated hourly

**Trending Score:**
```
Trending Score = (Engagement Velocity × 0.40) + 
                 (View Count / 1000 × 0.30) + 
                 (Recency Score × 0.20) + 
                 (Interest Match × 0.20)
```

### 3. **Reels Feed** (Infinite Scroll)
- Cursor-based pagination for smooth scrolling
- Weighted heavily on watch time (25%)
- Includes engagement velocity calculation
- Auto-play next reel when current reaches 80% watched

**Reel Weights:**
- Engagement: 35%
- Watch Time: 25%
- Recency: 15%
- Interest Match: 15%
- Social Connection: 10%

### 4. **Trending Feed** (Real-time)
- Shows top posts by engagement velocity
- Updated every 30 minutes
- Sorted by (Engagements in last hour / Engagements in last 6 hours)

---

## 📊 Engagement Tracking

### Actions Tracked
| Action | Weight in Score | Impact |
|--------|-----------------|--------|
| Like | ×1 | +0.3 to engagement |
| Comment | ×2 | +0.6 to engagement |
| Share | ×3 | +0.9 to engagement |
| View (>3s) | ×0 | Tracked separately |
| Save/Bookmark | ×2 | +0.6 to engagement |
| Watch (>80%) | ×1 | High watch time score |

---

## 🔄 Feed Algorithm Flow

```
User Opens App
    ↓
1. Get User's Followed Accounts
    ↓
2. Get User's Interests (Explicit + Implicit)
    ↓
3. Fetch Recent Posts (Last 7 days)
    From: Followed accounts (60%) + Recommendations (40%)
    ↓
4. For Each Post, Calculate Score:
    - Engagement Score
    - Recency Score
    - Interest Match Score
    - Connection Score
    - Watch Time Score
    - Personal History Score
    ↓
5. Apply Filters:
    - Remove posts from blocked users
    - Remove already viewed content
    - Remove sensitive content (if user preference)
    ↓
6. Sort by Final Score (Descending)
    ↓
7. Apply Pagination (20 per page)
    ↓
8. Return Feed
    ↓
9. Track Impressions for Analytics
```

---

## 🧠 User Interest Inference

### Explicit Interests (User-selected)
```
users.interests = ['photography', 'travel', 'food']
```

### Implicit Interests (From behavior)
Algorithm analyzes last 100 user interactions:
```
engagement table:
- COUNT by post tags where action_type IN ['like', 'comment', 'save']
- GROUP BY tag_name
- ORDER BY count DESC
- FILTER count > 2
- TAKE top 10
```

### Combined Interests
```
Final Interests = Explicit ∪ Implicit (with deduplication)
```

---

## 📈 Performance Optimization Techniques

### 1. **Engagement Metrics Caching**
Pre-calculated metrics stored in `engagement_metrics` table:
- Likes count
- Comments count  
- Shares count
- Views count
- Saves count
- Engagement velocity

Updated every hour or when changed significantly.

### 2. **Database Indexes**
Strategic indexes for fast queries:
```sql
-- Feed queries
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);

-- Engagement queries
CREATE INDEX idx_engagement_user_id ON engagement(user_id);
CREATE INDEX idx_engagement_action_type ON engagement(action_type);

-- Following queries
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
```

### 3. **Pagination Strategy**
- Use offset/limit for home feed (simpler, slower for large offsets)
- Use cursor pagination for reels (infinite scroll)
- Limit result set to 2x required (for internal filtering)

### 4. **Caching Strategy**
- Cache user interests in memory (1 hour)
- Cache engagement metrics (30 minutes)
- Cache trending posts (1 hour)

---

## 🔐 Anti-Abuse Measures

### 1. **Engagement Spam Detection**
- Limit likes per user: 100/hour, 500/day
- Detect bot patterns: Same action from same user within 1 second
- Flag accounts with unnatural engagement rates (>50% engagement from single user)

### 2. **Content Quality Scoring**
- Posts with multiple reports get lower scores
- Flagged content hidden from recommendations
- Creator reputation affects feed visibility

### 3. **Rate Limiting**
- Per-user API rate limits
- Per-IP rate limits
- Exponential backoff for repeated violations

---

## 📊 Analytics & Metrics

### Key Metrics Tracked
1. **Feed Impressions**
   - Which posts shown to which users
   - Rank position (1, 2, 3, etc.)
   - Algorithm score at time of impression

2. **Engagement Funnel**
   - View → Click → Like → Comment → Share

3. **Feed Quality Score**
   - User satisfaction based on clicks/saves/shares
   - Feedback on individual feed items

### SQL Queries for Analytics

```sql
-- Top performing posts
SELECT post_id, engagement_velocity, views_count
FROM engagement_metrics
ORDER BY engagement_velocity DESC
LIMIT 20;

-- User interests distribution
SELECT interests, COUNT(*) as user_count
FROM users
GROUP BY interests
ORDER BY user_count DESC;

-- Feed impression analysis
SELECT feed_type, AVG(score) as avg_score
FROM feed_impressions
GROUP BY feed_type;
```

---

## 🚀 Algorithm Improvements (Roadmap)

### Phase 1: Current Implementation
- ✅ 6-factor ranking system
- ✅ Interest-based recommendations
- ✅ Engagement tracking
- ✅ Multi-feed types

### Phase 2: Advanced Features
- [ ] Collaborative filtering (similar users)
- [ ] Matrix factorization for better recommendations
- [ ] Real-time trending calculation
- [ ] A/B testing framework
- [ ] User cohort analysis

### Phase 3: Machine Learning
- [ ] Deep learning model for ranking
- [ ] Natural language processing for post analysis
- [ ] Image recognition for automatic tagging
- [ ] Predictive engagement scoring

### Phase 4: Advanced Personalization
- [ ] Time-of-day personalization
- [ ] Mood detection from engagement patterns
- [ ] Cross-platform content recommendations
- [ ] Influencer amplification tier system

---

## 🔧 Configuration Parameters

Can be tuned in `feedAlgorithm.js`:

```javascript
// Weight adjustments (should sum to 1.0)
this.weights = {
  engagement: 0.30,        // ← Adjust if want more viral content
  recency: 0.15,          // ← Adjust if want fresher content
  userInterest: 0.25,     // ← Adjust for personalization
  socialConnection: 0.15, // ← Adjust for social graph importance
  watchTime: 0.10,        // ← Adjust for video priority
  personalHistory: 0.05   // ← Adjust for past behavior weight
};

// Decay parameters
this.DECAY_DAYS = 7;      // How fast old posts disappear
this.FEED_LIMIT = 20;     // Posts per page
this.EXPLORE_LIMIT = 30;  // Explore posts per page
```

---

## 📞 Debugging Tips

### Check Algorithm Scoring
```javascript
// Enable debug logging in feedAlgorithm.js
console.log('Scoring breakdown:', post.scoringBreakdown);
```

### Monitor Performance
```sql
-- Check slow queries
SELECT query_time, query
FROM postgres_logs
WHERE query_time > 1000;
```

### Test with Sample User
```sql
-- Get user interests
SELECT interests FROM users WHERE id = 'user-uuid';

-- Check recent engagement
SELECT * FROM engagement 
WHERE user_id = 'user-uuid' 
ORDER BY created_at DESC 
LIMIT 50;
```

---

## 📚 References

- Instagram Ranking Algorithm
- TikTok FYP (For You Page) Algorithm
- YouTube Recommendation System
- Netflix Recommendation Engine
