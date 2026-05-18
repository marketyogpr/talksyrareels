# Deployment Checklist & Quick Start

Complete checklist to deploy the Instagram-like feed algorithm to production.

## ✅ Pre-Deployment Checklist

### 1. Database Setup (Supabase)
- [ ] Create Supabase project
- [ ] Copy SQL from `SUPABASE_SCHEMA.md`
- [ ] Execute SQL in Supabase SQL Editor
- [ ] Verify all 16 tables created successfully
- [ ] Create indexes (included in SQL)
- [ ] Enable Row Level Security (RLS)
- [ ] Set up RLS policies (see below)
- [ ] Test database connectivity

### 2. Environment Configuration
- [ ] Get Supabase URL
  ```
  Settings → API → Project URL
  ```
- [ ] Get Supabase Anon Key
  ```
  Settings → API → Project API Keys → anon key
  ```
- [ ] Update `wrangler.toml` with credentials
- [ ] Verify R2 bucket is configured
- [ ] Test R2 connection

### 3. Code Review
- [ ] Review `feedAlgorithm.js` - Adjust weights if needed
- [ ] Review `engagementTracker.js` - Verify tracking logic
- [ ] Review `feedAPIService.js` - Check all endpoints
- [ ] Review `index.js` - Verify integration
- [ ] Check error handling and logging

### 4. Security Configuration

#### RLS Policies (Run in Supabase SQL)

```sql
-- Enable RLS on all tables
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Posts: Anyone can view published, users edit own
CREATE POLICY "posts_public_select" ON posts
  FOR SELECT USING (status = 'published');

CREATE POLICY "posts_user_insert" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_user_update" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

-- Engagement: Users track own engagement
CREATE POLICY "engagement_user_insert" ON engagement
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "engagement_user_delete" ON engagement
  FOR DELETE USING (auth.uid() = user_id);

-- Users: Public read, own profile edit
CREATE POLICY "users_select" ON users
  FOR SELECT USING (true);

CREATE POLICY "users_update" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### 5. API Keys & Secrets
- [ ] Supabase URL set in Wrangler secrets
- [ ] Supabase Anon Key set in Wrangler secrets
- [ ] R2 Access Key configured
- [ ] R2 Secret Key configured
- [ ] R2_PUBLIC_DOMAIN set

### 6. Logging & Monitoring
- [ ] Enable Cloudflare analytics
- [ ] Set up error tracking (Sentry/similar)
- [ ] Configure Supabase logs
- [ ] Set up alerts for errors

---

## 🚀 Deployment Steps

### Step 1: Install Dependencies
```bash
cd /workspaces/talksyrareels
npm install
```

### Step 2: Update Wrangler Configuration
```bash
# Edit wrangler.toml
# Add Supabase credentials to both staging and production environments

[env.staging]
vars = {
  R2_PUBLIC_DOMAIN = "...",
  SUPABASE_URL = "your-staging-url",
  SUPABASE_ANON_KEY = "your-staging-key"
}

[env.production]
vars = {
  R2_PUBLIC_DOMAIN = "...",
  SUPABASE_URL = "your-production-url",
  SUPABASE_ANON_KEY = "your-production-key"
}
```

### Step 3: Test Locally
```bash
npm run dev
# Visit http://localhost:8787/
# Test endpoints:
# - GET http://localhost:8787/api/feed/home?user_id=test-user
# - POST http://localhost:8787/api/engagement/like (with JSON body)
```

### Step 4: Deploy to Staging
```bash
npm run deploy:staging
```

### Step 5: Test Staging Deployment
```bash
# Test all API endpoints
# Check logs in Cloudflare dashboard
wrangler tail --env staging
```

### Step 6: Deploy to Production
```bash
npm run deploy:production
# Verify deployment completed successfully
# Check logs: wrangler tail --env production
```

---

## 📱 Flutter App Integration

### Step 1: Update App Configuration
```dart
// config.dart
const String API_BASE_URL = 'https://api.buyviro.com';
const String SUPABASE_URL = 'your-supabase-url';
const String SUPABASE_ANON_KEY = 'your-supabase-key';
```

### Step 2: Create Feed Service
```bash
# Copy FeedService code from FEED_ALGORITHM_GUIDE.md
flutter pub add http
flutter pub add supabase_flutter
```

### Step 3: Update Home Page
```dart
// Replace existing home page with feed integration
// See FEED_ALGORITHM_GUIDE.md for complete example
```

### Step 4: Update Reel Player
```dart
// Add watch time tracking
// See FEED_ALGORITHM_GUIDE.md for trackReelWatchTime example
```

### Step 5: Test App
```bash
flutter pub get
flutter run
```

---

## 🔍 Verification Tests

### API Endpoint Tests

```bash
# 1. Test Home Feed
curl -X GET "https://api.buyviro.com/api/feed/home?user_id=test-user&limit=20"

# 2. Test Explore Feed
curl -X GET "https://api.buyviro.com/api/feed/explore?user_id=test-user&category=all"

# 3. Test Like Endpoint
curl -X POST "https://api.buyviro.com/api/engagement/like" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test-user","post_id":"test-post","is_like":true}'

# 4. Test User Interests
curl -X GET "https://api.buyviro.com/api/interests/get?user_id=test-user"

# 5. Test Stats
curl -X GET "https://api.buyviro.com/api/stats/user-engagement?user_id=test-user"
```

### Database Verification

```sql
-- Check table counts
SELECT COUNT(*) FROM posts;
SELECT COUNT(*) FROM reels;
SELECT COUNT(*) FROM engagement;
SELECT COUNT(*) FROM users;

-- Check indexes
SELECT * FROM pg_indexes WHERE tablename = 'posts';

-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('posts', 'reels', 'engagement', 'users');
```

---

## 🎯 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Home Feed Load Time | < 1s | |
| Explore Feed Load Time | < 1.5s | |
| Like/Comment API | < 500ms | |
| Database Query | < 200ms | |
| Engagement Tracking | < 300ms | |
| Algorithm Scoring | < 100ms | |

---

## 🐛 Post-Deployment Troubleshooting

### Feed Returns Empty
```
Check:
1. User has followed accounts: SELECT * FROM follows WHERE follower_id = 'user_id'
2. Posts exist: SELECT COUNT(*) FROM posts WHERE status = 'published'
3. API logs: wrangler tail --env production
4. Supabase connection: Check environment variables
```

### Slow Feed Loading
```
Solutions:
1. Check database indexes: SELECT * FROM pg_indexes
2. Add more indexes if missing
3. Enable caching in Cloudflare
4. Optimize queries in feedAlgorithm.js
5. Check Supabase database size
```

### Engagement Not Tracking
```
Check:
1. User ID is correct: SELECT * FROM users WHERE id = 'user_id'
2. Post ID exists: SELECT * FROM posts WHERE id = 'post_id'
3. engagement_metrics table has data: SELECT * FROM engagement_metrics
4. Supabase RLS policies allow inserts
```

### High API Latency
```
Solutions:
1. Enable Cloudflare Cache Everything
2. Use cache headers in responses
3. Implement client-side caching
4. Reduce result set size
5. Check Supabase database load
```

---

## 📊 Monitoring Setup

### Cloudflare Analytics
1. Go to Cloudflare dashboard
2. Select your domain
3. Analytics → Traffic
4. Monitor:
   - Total requests
   - Error rate (4xx, 5xx)
   - Response times
   - Bandwidth usage

### Supabase Monitoring
1. Go to Supabase dashboard
2. Logs → Postgres
3. Monitor:
   - Slow queries (> 200ms)
   - Failed queries
   - Connection count
   - Database size

### Custom Logging
```javascript
// In feedAlgorithm.js
console.log('Feed request:', { userId, feedType, itemCount, responseTime });
```

---

## 🔄 Continuous Deployment

### GitHub Actions Setup (Optional)
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run deploy:production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

## 🎓 Learning Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Supabase Documentation](https://supabase.com/docs)
- [Instagram Algorithm Explained](https://about.instagram.com/community/blog/posts/how-instagram-ranking-works)
- [YouTube Recommendation System](https://www.youtube.com/howyoutubeworks/our-process/information/how-search-works/)

---

## 📞 Support & Help

### Common Issues

**Q: API returns 500 error**
A: Check Supabase credentials, enable debug logging, check Supabase logs

**Q: Feed loads but shows no posts**
A: Verify posts exist in database, check user interests, verify RLS policies

**Q: Algorithm scoring seems off**
A: Check weight values, verify engagement metrics are calculated, test with sample data

**Q: High latency on some requests**
A: Enable caching, optimize database queries, check Supabase database load

---

## ✨ Next Phase Features

After successful deployment, consider:

1. **Machine Learning Integration**
   - Train model on engagement data
   - Predict engagement before posting
   - Personalized ranking improvements

2. **Advanced Analytics**
   - User journey analysis
   - Content performance analytics
   - Creator insights dashboard

3. **Real-time Features**
   - Live feed updates via WebSocket
   - Real-time trending calculations
   - Instant engagement notifications

4. **Monetization**
   - Sponsored content ranking
   - Premium feed options
   - Creator monetization features

---

## 🎉 Success Checklist

- [ ] All API endpoints working
- [ ] Feed loads in < 1 second
- [ ] Engagement tracking working
- [ ] User interests being inferred
- [ ] Algorithm scoring consistent
- [ ] No database errors
- [ ] RLS policies preventing unauthorized access
- [ ] Analytics data being collected
- [ ] Flutter app connected and working
- [ ] Production deployment successful
- [ ] Team trained on system

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Status:** _______________

For detailed implementation questions, refer to:
- `ALGORITHM_EXPLANATION.md` - Algorithm details
- `FEED_ALGORITHM_GUIDE.md` - Integration guide
- `SUPABASE_SCHEMA.md` - Database schema
