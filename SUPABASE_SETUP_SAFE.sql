-- ====================================================================
-- TalkSyra Reels - Supabase Database Setup (IF NOT EXISTS)
-- ====================================================================
-- Database URL: https://frmazzmzyychdfajnslt.supabase.co
-- Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZybWF6em16eXljaGRmYWpuc2x0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NzEwMDMsImV4cCI6MjA4NzM0NzAwM30.85x1WBkFX9bdpGw1T5-azJ03WsdzJ1r2EiiScxQnQl0
-- ====================================================================
-- This version uses IF NOT EXISTS to prevent duplicate table errors
-- Safe to run multiple times!
-- ====================================================================

-- ====================================================================
-- 1. USERS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  profile_pic TEXT,
  cover_pic TEXT,
  bio TEXT,
  website TEXT,
  location TEXT,
  birth_date DATE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_pro_member BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,
  red_coins INT8 DEFAULT 0,
  green_coins INT8 DEFAULT 0,
  follower_count INT8 DEFAULT 0,
  following_count INT8 DEFAULT 0,
  post_count INT8 DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  last_seen TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
CREATE INDEX IF NOT EXISTS idx_users_follower_count ON users(follower_count DESC);

-- ====================================================================
-- 2. POSTS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) DEFAULT 'post',
  caption TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  audio_name TEXT,
  audio_url TEXT,
  aspect_ratio FLOAT8,
  duration FLOAT8,
  visibility VARCHAR(20) DEFAULT 'public',
  is_monetized BOOLEAN DEFAULT FALSE,
  location_name TEXT,
  like_count INT8 DEFAULT 0,
  comment_count INT8 DEFAULT 0,
  share_count INT8 DEFAULT 0,
  view_count INT8 DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_monetized ON posts(is_monetized);

-- ====================================================================
-- 3. LIKES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.likes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

-- ====================================================================
-- 4. COMMENTS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- ====================================================================
-- 5. STORIES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type VARCHAR(20) DEFAULT 'image',
  caption TEXT,
  expires_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);

-- ====================================================================
-- 6. STORY_VIEWS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.story_views (
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (story_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_user_id ON story_views(user_id);

-- ====================================================================
-- 7. STORY_HIGHLIGHTS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.story_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cover_image TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_story_highlights_user_id ON story_highlights(user_id);

-- ====================================================================
-- 8. FOLLOWERS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.followers (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'accepted',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON followers(following_id);
CREATE INDEX IF NOT EXISTS idx_followers_created_at ON followers(created_at DESC);

-- ====================================================================
-- 9. BLOCKS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.blocks (
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);

-- ====================================================================
-- 10. SAVES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.saves (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_saves_user_id ON saves(user_id);
CREATE INDEX IF NOT EXISTS idx_saves_post_id ON saves(post_id);

-- ====================================================================
-- 11. REPOSTS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.reposts (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_reposts_user_id ON reposts(user_id);
CREATE INDEX IF NOT EXISTS idx_reposts_post_id ON reposts(post_id);

-- ====================================================================
-- 12. GROUPS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  member_count INT8 DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_groups_creator_id ON groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at DESC);

-- ====================================================================
-- 13. GROUP_MEMBERS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);

-- ====================================================================
-- 14. CONVERSATIONS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) DEFAULT 'private',
  name TEXT,
  image TEXT,
  last_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- ====================================================================
-- 15. CONVERSATION_MEMBERS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation_id ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON conversation_members(user_id);

-- ====================================================================
-- 16. MESSAGES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT,
  media_url TEXT,
  type VARCHAR(20) DEFAULT 'text',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ====================================================================
-- 17. CALLS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_calls_caller_id ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver_id ON calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_calls_conversation_id ON calls(conversation_id);
CREATE INDEX IF NOT EXISTS idx_calls_started_at ON calls(started_at DESC);

-- ====================================================================
-- 18. NOTIFICATIONS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON notifications(actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ====================================================================
-- 19. REPORTS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target_type ON reports(target_type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- ====================================================================
-- 20. POLLS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_polls_post_id ON polls(post_id);

-- ====================================================================
-- 21. POLL_OPTIONS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  vote_count INT8 DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);

-- ====================================================================
-- 22. POLL_VOTES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.poll_votes (
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option_id ON poll_votes(option_id);

-- ====================================================================
-- 23. TRANSACTIONS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INT8 NOT NULL,
  currency VARCHAR(10) DEFAULT 'PKR',
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- ====================================================================
-- 24. ADS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  media_url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  budget INT8 NOT NULL,
  spent INT8 DEFAULT 0,
  impressions INT8 DEFAULT 0,
  clicks INT8 DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ads_advertiser_id ON ads(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status);
CREATE INDEX IF NOT EXISTS idx_ads_created_at ON ads(created_at DESC);

-- ====================================================================
-- ENABLE RLS ON ALL BASE TABLES
-- ====================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- RLS POLICIES (Row Level Security) - Skip if already exist
-- ====================================================================

DO $$
BEGIN
  CREATE POLICY "users_select_public" ON users FOR SELECT USING (TRUE);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- POSTS Policies
DO $$
BEGIN
  CREATE POLICY "posts_select_public" ON posts FOR SELECT USING (visibility = 'public');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "posts_select_own_private" ON posts FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "posts_insert_own" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "posts_update_own" ON posts FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "posts_delete_own" ON posts FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- LIKES Policies
DO $$
BEGIN
  CREATE POLICY "likes_select_own" ON likes FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "likes_insert_own" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "likes_delete_own" ON likes FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- COMMENTS Policies
DO $$
BEGIN
  CREATE POLICY "comments_select_all" ON comments FOR SELECT USING (TRUE);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "comments_insert_own" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "comments_update_own" ON comments FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "comments_delete_own" ON comments FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- STORIES Policies
DO $$
BEGIN
  CREATE POLICY "stories_select_own_and_public" ON stories FOR SELECT USING (auth.uid() = user_id OR TRUE);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "stories_insert_own" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "stories_delete_own" ON stories FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- STORY_VIEWS Policies
DO $$
BEGIN
  CREATE POLICY "story_views_insert_own" ON story_views FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "story_views_select_own" ON story_views FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- FOLLOWERS Policies
DO $$
BEGIN
  CREATE POLICY "followers_select_all" ON followers FOR SELECT USING (TRUE);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "followers_insert_own" ON followers FOR INSERT WITH CHECK (auth.uid() = follower_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "followers_delete_own" ON followers FOR DELETE USING (auth.uid() = follower_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- BLOCKS Policies
DO $$
BEGIN
  CREATE POLICY "blocks_select_own" ON blocks FOR SELECT USING (auth.uid() = blocker_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "blocks_insert_own" ON blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "blocks_delete_own" ON blocks FOR DELETE USING (auth.uid() = blocker_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- SAVES Policies
DO $$
BEGIN
  CREATE POLICY "saves_select_own" ON saves FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "saves_insert_own" ON saves FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "saves_delete_own" ON saves FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- MESSAGES Policies
DO $$
BEGIN
  CREATE POLICY "messages_select_member" ON messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_members 
      WHERE conversation_members.user_id = auth.uid() 
      AND conversation_members.conversation_id = messages.conversation_id
    )
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "messages_insert_member" ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM conversation_members 
      WHERE conversation_members.user_id = auth.uid() 
      AND conversation_members.conversation_id = messages.conversation_id
    )
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- NOTIFICATIONS Policies
DO $$
BEGIN
  CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- TRANSACTIONS Policies
DO $$
BEGIN
  CREATE POLICY "transactions_select_own" ON transactions FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ====================================================================
-- ADVANCED FEATURES - ALGORITHM & ANALYTICS TABLES
-- ====================================================================

-- ====================================================================
-- 25. HASHTAGS TABLE (For Search & Trending)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  post_count INT8 DEFAULT 0,
  trending_score FLOAT8 DEFAULT 0,
  trending_rank INT8,
  is_trending BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hashtags_tag_name ON hashtags(tag_name);
CREATE INDEX IF NOT EXISTS idx_hashtags_slug ON hashtags(slug);
CREATE INDEX IF NOT EXISTS idx_hashtags_trending_score ON hashtags(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_hashtags_is_trending ON hashtags(is_trending);

-- ====================================================================
-- 26. POST_HASHTAGS TABLE (Post-Hashtag Relationship)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.post_hashtags (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);

CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag_id ON post_hashtags(hashtag_id);

-- ====================================================================
-- 27. USER_INTERESTS TABLE (For Personalized Algorithm)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interest_name TEXT NOT NULL,
  interest_score FLOAT8 DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, interest_name)
);

CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_interest_score ON user_interests(interest_score DESC);

-- ====================================================================
-- 28. FEED_RANKING_SCORES TABLE (Algorithm Scores)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.feed_ranking_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  engagement_score FLOAT8 DEFAULT 0,
  recency_score FLOAT8 DEFAULT 0,
  relevance_score FLOAT8 DEFAULT 0,
  personalization_score FLOAT8 DEFAULT 0,
  total_score FLOAT8 DEFAULT 0,
  rank_position INT8,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_scores_user_id ON feed_ranking_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_scores_total_score ON feed_ranking_scores(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_feed_scores_created_at ON feed_ranking_scores(created_at DESC);

-- ====================================================================
-- 29. ENGAGEMENT_ANALYTICS TABLE (Detailed Analytics)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.engagement_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  total_views INT8 DEFAULT 0,
  total_likes INT8 DEFAULT 0,
  total_comments INT8 DEFAULT 0,
  total_shares INT8 DEFAULT 0,
  total_saves INT8 DEFAULT 0,
  engagement_rate FLOAT8 DEFAULT 0,
  view_to_like_ratio FLOAT8 DEFAULT 0,
  last_hour_views INT8 DEFAULT 0,
  last_24h_views INT8 DEFAULT 0,
  last_7d_views INT8 DEFAULT 0,
  avg_engagement_per_hour FLOAT8 DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_analytics_engagement_rate ON engagement_analytics(engagement_rate DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_analytics_updated_at ON engagement_analytics(updated_at DESC);

-- ====================================================================
-- 30. USER_ANALYTICS TABLE (User Performance)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.user_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_posts INT8 DEFAULT 0,
  total_followers INT8 DEFAULT 0,
  total_following INT8 DEFAULT 0,
  total_engagement INT8 DEFAULT 0,
  avg_post_engagement FLOAT8 DEFAULT 0,
  growth_rate FLOAT8 DEFAULT 0,
  engagement_rate FLOAT8 DEFAULT 0,
  last_post_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_analytics_engagement_rate ON user_analytics(engagement_rate DESC);
CREATE INDEX IF NOT EXISTS idx_user_analytics_growth_rate ON user_analytics(growth_rate DESC);

-- ====================================================================
-- 31. TRENDING_POSTS TABLE (For Explore Feed)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.trending_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL UNIQUE REFERENCES posts(id) ON DELETE CASCADE,
  trending_score FLOAT8 DEFAULT 0,
  trending_rank INT8,
  category VARCHAR(50),
  is_trending BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trending_posts_trending_score ON trending_posts(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_posts_trending_rank ON trending_posts(trending_rank ASC);
CREATE INDEX IF NOT EXISTS idx_trending_posts_category ON trending_posts(category);
CREATE INDEX IF NOT EXISTS idx_trending_posts_is_trending ON trending_posts(is_trending);
CREATE INDEX IF NOT EXISTS idx_trending_posts_expires_at ON trending_posts(expires_at);

-- ====================================================================
-- 32. RECOMMENDATIONS TABLE (Personalized Recommendations)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recommended_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  recommendation_type VARCHAR(20),
  confidence_score FLOAT8 DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  interacted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_confidence_score ON recommendations(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations(created_at DESC);

-- ====================================================================
-- 33. USER_ACTIVITY_LOG TABLE (Activity Tracking for Analytics)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_activity_type ON user_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON user_activity_log(created_at DESC);

-- ====================================================================
-- 34. DEVICE_INFO TABLE (Device & Platform Tracking)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.device_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT UNIQUE,
  device_type VARCHAR(20),
  os_type VARCHAR(20),
  os_version TEXT,
  app_version TEXT,
  last_active TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_device_info_user_id ON device_info(user_id);
CREATE INDEX IF NOT EXISTS idx_device_info_device_id ON device_info(device_id);

-- ====================================================================
-- 35. SEARCH_HISTORY TABLE (For Search Analytics)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  search_type VARCHAR(20) DEFAULT 'text',
  result_count INT8 DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_search_query ON search_history(search_query);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);

-- ====================================================================
-- 36. CONTENT_MODERATION_QUEUE TABLE (Moderation Management)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.content_moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  violation_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  action_taken VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_moderation_status ON content_moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_severity ON content_moderation_queue(severity);
CREATE INDEX IF NOT EXISTS idx_moderation_assigned_to ON content_moderation_queue(assigned_to);
CREATE INDEX IF NOT EXISTS idx_moderation_created_at ON content_moderation_queue(created_at DESC);

-- ====================================================================
-- 37. USER_PREFERENCES TABLE (Algorithm Preferences)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  feed_algorithm VARCHAR(20) DEFAULT 'personalized',
  content_quality_threshold FLOAT8 DEFAULT 0.5,
  enable_recommendations BOOLEAN DEFAULT TRUE,
  enable_trending BOOLEAN DEFAULT TRUE,
  max_ads_per_feed INT8 DEFAULT 2,
  language VARCHAR(10) DEFAULT 'en',
  content_filter TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ====================================================================
-- 38. FEED_CACHE TABLE (Performance Optimization)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.feed_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feed_type VARCHAR(20) DEFAULT 'home',
  cached_posts JSONB NOT NULL,
  cache_score FLOAT8 DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP + INTERVAL '1 hour',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feed_cache_user_id ON feed_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_cache_feed_type ON feed_cache(feed_type);
CREATE INDEX IF NOT EXISTS idx_feed_cache_expires_at ON feed_cache(expires_at);

-- ====================================================================
-- 39. POST_VIEWS_TIMELINE TABLE (Detailed View Analytics)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.post_views_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  view_duration INT8 DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_post_views_timeline_post_id ON post_views_timeline(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_timeline_viewer_id ON post_views_timeline(viewer_id);
CREATE INDEX IF NOT EXISTS idx_post_views_timeline_created_at ON post_views_timeline(created_at DESC);

-- ====================================================================
-- 40. COINS_TRANSACTION_LOG TABLE (Detailed Coin Tracking)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.coins_transaction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coin_type VARCHAR(20) NOT NULL,
  amount INT8 NOT NULL,
  reason VARCHAR(50) NOT NULL,
  reference_id UUID,
  reference_type VARCHAR(20),
  balance_before INT8,
  balance_after INT8,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coins_log_user_id ON coins_transaction_log(user_id);
CREATE INDEX IF NOT EXISTS idx_coins_log_coin_type ON coins_transaction_log(coin_type);
CREATE INDEX IF NOT EXISTS idx_coins_log_reason ON coins_transaction_log(reason);
CREATE INDEX IF NOT EXISTS idx_coins_log_created_at ON coins_transaction_log(created_at DESC);

-- ====================================================================
-- ENABLE RLS ON ADVANCED TABLES
-- ====================================================================
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_ranking_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_views_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE coins_transaction_log ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- RLS POLICIES FOR ADVANCED TABLES (Safe creation with DO blocks)
-- ====================================================================

DO $$
BEGIN
  CREATE POLICY "hashtags_select_all" ON hashtags FOR SELECT USING (TRUE);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "user_interests_select_own" ON user_interests FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "user_interests_insert_own" ON user_interests FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "user_interests_update_own" ON user_interests FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "trending_posts_select_all" ON trending_posts FOR SELECT USING (TRUE);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "user_analytics_select_own" ON user_analytics FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "recommendations_select_own" ON recommendations FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "activity_log_select_own" ON user_activity_log FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "activity_log_insert_own" ON user_activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "search_history_select_own" ON search_history FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "search_history_insert_own" ON search_history FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "user_preferences_select_own" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "user_preferences_update_own" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "feed_cache_select_own" ON feed_cache FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "post_views_select_own" ON post_views_timeline FOR SELECT USING (auth.uid() = viewer_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ====================================================================
-- SUCCESS! All tables created with indexes and RLS policies
-- Tables and indexes use IF NOT EXISTS
-- RLS policies use DO blocks to prevent duplicate errors
-- ====================================================================
