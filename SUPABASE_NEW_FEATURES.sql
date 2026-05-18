-- ===================================================================
-- 🆕 TALKSYRA REELS - ADDITIONAL FEATURES (Only New Tables)
-- ===================================================================
-- Date: May 18, 2026
-- इस file को SUPABASE_SETUP_SAFE.sql के बाद run करो
-- सिर्फ नई functionality add करती है, duplicate नहीं!
-- ===================================================================

-- ===================================================================
-- 1️⃣ PRIVACY_SETTINGS TABLE (नया)
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_privacy VARCHAR(20) DEFAULT 'public',
  allow_messages VARCHAR(20) DEFAULT 'everyone',
  allow_comments VARCHAR(20) DEFAULT 'everyone',
  allow_tags VARCHAR(20) DEFAULT 'everyone',
  show_activity BOOLEAN DEFAULT TRUE,
  hide_stories BOOLEAN DEFAULT FALSE,
  allow_search_index BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_privacy_settings_user_id ON privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_settings_account_privacy ON privacy_settings(account_privacy);

-- ===================================================================
-- 2️⃣ HASHTAGS TABLE (अगर पहले से नहीं है)
-- ===================================================================
-- Check और add करो अगर table exists तो
DO $$
BEGIN
  -- अगर table न हो तो create करो
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hashtags' AND table_schema = 'public') THEN
    CREATE TABLE public.hashtags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tag TEXT UNIQUE NOT NULL,
      media_count INT8 DEFAULT 0,
      trending BOOLEAN DEFAULT FALSE,
      trending_rank INT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  ELSE
    -- अगर table है तो column add करो अगर नहीं है
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hashtags' AND column_name = 'tag') THEN
      ALTER TABLE public.hashtags ADD COLUMN tag TEXT UNIQUE NOT NULL DEFAULT '';
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON hashtags(tag);
CREATE INDEX IF NOT EXISTS idx_hashtags_trending ON hashtags(trending);
CREATE INDEX IF NOT EXISTS idx_hashtags_media_count ON hashtags(media_count DESC);

-- ===================================================================
-- 3️⃣ POST_HASHTAGS TABLE (Junction - Safe)
-- ===================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_hashtags' AND table_schema = 'public') THEN
    CREATE TABLE public.post_hashtags (
      id BIGSERIAL PRIMARY KEY,
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
      UNIQUE(post_id, hashtag_id)
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_post_hashtags_post_id ON post_hashtags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag_id ON post_hashtags(hashtag_id);

-- ===================================================================
-- 4️⃣ VIEWS TABLE (View Tracking - Safe)
-- ===================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'views' AND table_schema = 'public') THEN
    CREATE TABLE public.views (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      ip_address VARCHAR(50),
      view_duration INT,
      device_type VARCHAR(50),
      viewed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_views_post_id ON views(post_id);
CREATE INDEX IF NOT EXISTS idx_views_user_id ON views(user_id);
CREATE INDEX IF NOT EXISTS idx_views_viewed_at ON views(viewed_at DESC);

-- ===================================================================
-- 5️⃣ SHARES TABLE (Safe)
-- ===================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shares' AND table_schema = 'public') THEN
    CREATE TABLE public.shares (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      shared_with UUID REFERENCES users(id) ON DELETE SET NULL,
      share_type VARCHAR(50) DEFAULT 'direct_message',
      message TEXT,
      shared_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_shares_post_id ON shares(post_id);
CREATE INDEX IF NOT EXISTS idx_shares_user_id ON shares(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_shared_with ON shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_shares_shared_at ON shares(shared_at DESC);

-- ===================================================================
-- 6️⃣ FEED_ENGAGEMENT TABLE (Analytics - Safe)
-- ===================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feed_engagement' AND table_schema = 'public') THEN
    CREATE TABLE public.feed_engagement (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      engagement_type VARCHAR(50) NOT NULL,
      engagement_score DECIMAL(5, 3),
      timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_feed_engagement_user_id ON feed_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_engagement_post_id ON feed_engagement(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_engagement_timestamp ON feed_engagement(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_feed_engagement_type ON feed_engagement(engagement_type);

-- ===================================================================
-- 7️⃣ MENTION_TAGS TABLE (Safe)
-- ===================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mention_tags' AND table_schema = 'public') THEN
    CREATE TABLE public.mention_tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_mention_tags_post_id ON mention_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_mention_tags_mentioned_user_id ON mention_tags(mentioned_user_id);

-- ===================================================================
-- ✅ ADVANCED FUNCTIONS
-- ===================================================================

-- ==============================================
-- 📈 Increment View Count (Safe)
-- ==============================================
CREATE OR REPLACE FUNCTION increment_post_views(
  p_post_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_ip_address VARCHAR DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  BEGIN
    -- Insert view record
    INSERT INTO views (post_id, user_id, ip_address, viewed_at)
    VALUES (p_post_id, p_user_id, p_ip_address, CURRENT_TIMESTAMP);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  BEGIN
    -- Update view count in posts
    UPDATE posts SET view_count = view_count + 1 WHERE id = p_post_id;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- ❤️ Add Like (with notification)
-- ==============================================
CREATE OR REPLACE FUNCTION add_like_with_notification(
  p_post_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_post_owner UUID;
BEGIN
  -- Check if already liked
  IF NOT EXISTS (
    SELECT 1 FROM likes WHERE post_id = p_post_id AND user_id = p_user_id
  ) THEN
    -- Add like
    INSERT INTO likes (post_id, user_id) VALUES (p_post_id, p_user_id);
    
    -- Update like count
    UPDATE posts SET like_count = like_count + 1 WHERE id = p_post_id;
    
    -- Get post owner
    SELECT user_id INTO v_post_owner FROM posts WHERE id = p_post_id;
    
    -- Create notification
    IF v_post_owner != p_user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, post_id)
      VALUES (v_post_owner, p_user_id, 'like', p_post_id);
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 💔 Remove Like
-- ==============================================
CREATE OR REPLACE FUNCTION remove_like(
  p_post_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM likes WHERE post_id = p_post_id AND user_id = p_user_id;
  UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 💬 Add Comment (with notification)
-- ==============================================
CREATE OR REPLACE FUNCTION add_comment_with_notification(
  p_post_id UUID,
  p_user_id UUID,
  p_content TEXT,
  p_parent_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_comment_id UUID;
  v_post_owner UUID;
BEGIN
  -- Create comment
  v_comment_id := gen_random_uuid();
  
  INSERT INTO comments (id, post_id, user_id, parent_id, content)
  VALUES (v_comment_id, p_post_id, p_user_id, p_parent_id, p_content);
  
  -- Update comment count
  UPDATE posts SET comment_count = comment_count + 1 WHERE id = p_post_id;
  
  -- If reply, update parent's reply count
  IF p_parent_id IS NOT NULL THEN
    UPDATE comments SET reply_count = COALESCE(reply_count, 0) + 1 
    WHERE id = p_parent_id;
  END IF;
  
  -- Get post owner and create notification
  SELECT user_id INTO v_post_owner FROM posts WHERE id = p_post_id;
  
  IF v_post_owner != p_user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, post_id)
    VALUES (v_post_owner, p_user_id, 'comment', p_post_id);
  END IF;
  
  RETURN v_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 📤 Add Share
-- ==============================================
CREATE OR REPLACE FUNCTION add_share(
  p_post_id UUID,
  p_user_id UUID,
  p_share_type VARCHAR,
  p_shared_with UUID DEFAULT NULL,
  p_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Insert share record
  INSERT INTO shares (post_id, user_id, share_type, shared_with, message)
  VALUES (p_post_id, p_user_id, p_share_type, p_shared_with, p_message);
  
  -- Update share count
  UPDATE posts SET share_count = share_count + 1 WHERE id = p_post_id;
  
  -- Create notification if shared with specific user
  IF p_shared_with IS NOT NULL THEN
    INSERT INTO notifications (user_id, actor_id, type, post_id)
    VALUES (p_shared_with, p_user_id, 'share', p_post_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 🔐 Update Privacy Settings
-- ==============================================
CREATE OR REPLACE FUNCTION update_privacy_settings(
  p_user_id UUID,
  p_account_privacy VARCHAR DEFAULT NULL,
  p_allow_messages VARCHAR DEFAULT NULL,
  p_allow_comments VARCHAR DEFAULT NULL,
  p_allow_tags VARCHAR DEFAULT NULL,
  p_show_activity BOOLEAN DEFAULT NULL,
  p_allow_search_index BOOLEAN DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM privacy_settings WHERE user_id = p_user_id) THEN
    UPDATE privacy_settings 
    SET 
      account_privacy = COALESCE(p_account_privacy, account_privacy),
      allow_messages = COALESCE(p_allow_messages, allow_messages),
      allow_comments = COALESCE(p_allow_comments, allow_comments),
      allow_tags = COALESCE(p_allow_tags, allow_tags),
      show_activity = COALESCE(p_show_activity, show_activity),
      allow_search_index = COALESCE(p_allow_search_index, allow_search_index),
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;
  ELSE
    INSERT INTO privacy_settings (user_id, account_privacy, allow_messages, allow_comments, allow_tags, show_activity, allow_search_index)
    VALUES (p_user_id, COALESCE(p_account_privacy, 'public'), COALESCE(p_allow_messages, 'everyone'), 
            COALESCE(p_allow_comments, 'everyone'), COALESCE(p_allow_tags, 'everyone'), 
            COALESCE(p_show_activity, TRUE), COALESCE(p_allow_search_index, TRUE));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 📊 Get User Feed (Personalized)
-- ==============================================
CREATE OR REPLACE FUNCTION get_user_feed(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  user_id UUID,
  username TEXT,
  profile_pic TEXT,
  caption TEXT,
  media_url TEXT,
  view_count INT8,
  like_count INT8,
  comment_count INT8,
  share_count INT8,
  is_liked BOOLEAN,
  is_saved BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    u.username,
    u.profile_pic,
    p.caption,
    p.media_url,
    p.view_count,
    p.like_count,
    p.comment_count,
    p.share_count,
    CASE WHEN l.post_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_liked,
    CASE WHEN s.post_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_saved,
    p.created_at
  FROM posts p
  JOIN users u ON p.user_id = u.id
  LEFT JOIN likes l ON p.id = l.post_id AND l.user_id = p_user_id
  LEFT JOIN saves s ON p.id = s.post_id AND s.user_id = p_user_id
  LEFT JOIN blocks b ON (b.blocker_id = p_user_id AND b.blocked_id = p.user_id) 
                     OR (b.blocker_id = p.user_id AND b.blocked_id = p.user_id)
  WHERE p.visibility = 'public' AND b.blocker_id IS NULL
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 🔍 Search by Hashtag (Safe Version)
-- ==============================================
CREATE OR REPLACE FUNCTION search_media_by_hashtag(
  p_hashtag VARCHAR,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  title TEXT,
  media_url TEXT,
  view_count INT8,
  like_count INT8,
  username TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.caption,
    p.media_url,
    p.view_count,
    p.like_count,
    u.username,
    p.created_at
  FROM posts p
  JOIN users u ON p.user_id = u.id
  JOIN post_hashtags ph ON p.id = ph.post_id
  JOIN hashtags h ON ph.hashtag_id = h.id
  WHERE LOWER(h.tag) = LOWER(p_hashtag) AND p.visibility = 'public'
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 🏆 Get Trending Hashtags (Safe Version)
-- ==============================================
CREATE OR REPLACE FUNCTION get_trending_hashtags(
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  tag_id UUID,
  tag TEXT,
  media_count INT8
) AS $$
BEGIN
  RETURN QUERY
  SELECT h.id, h.tag, h.media_count
  FROM hashtags h
  WHERE h.trending = TRUE
  ORDER BY h.media_count DESC
  LIMIT p_limit;
EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 📱 Get User Conversations (Improved)
-- ==============================================
CREATE OR REPLACE FUNCTION get_user_conversations(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  conversation_id UUID,
  last_message TEXT,
  sender_username TEXT,
  unread_count INT8,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.last_message,
    u.username,
    (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = FALSE AND sender_id != p_user_id)::INT8,
    c.updated_at
  FROM conversations c
  JOIN conversation_members cm ON c.id = cm.conversation_id
  LEFT JOIN messages m ON c.id = m.conversation_id
  LEFT JOIN users u ON m.sender_id = u.id
  WHERE cm.user_id = p_user_id
  ORDER BY c.updated_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- ✅ ENABLE RLS ON NEW TABLES
-- ===================================================================
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE views ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE mention_tags ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- ✅ BASIC RLS POLICIES FOR NEW TABLES
-- ===================================================================

-- Privacy Settings - Only user can read/update own
DO $$
BEGIN
  CREATE POLICY "privacy_settings_select_own" ON privacy_settings FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "privacy_settings_update_own" ON privacy_settings FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Hashtags - Everyone can read
DO $$
BEGIN
  CREATE POLICY "hashtags_select_public" ON hashtags FOR SELECT USING (TRUE);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Views - Only user can view own views
DO $$
BEGIN
  CREATE POLICY "views_select_own" ON views FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Shares - Only user can view own shares
DO $$
BEGIN
  CREATE POLICY "shares_select_own" ON shares FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Feed Engagement - Only user can view own
DO $$
BEGIN
  CREATE POLICY "feed_engagement_select_own" ON feed_engagement FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ===================================================================
-- ✅ ADDITIONAL INDEXES FOR PERFORMANCE
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_privacy_settings_show_activity ON privacy_settings(show_activity);
CREATE INDEX IF NOT EXISTS idx_hashtags_trending_rank ON hashtags(trending_rank);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_unique ON post_hashtags(post_id, hashtag_id);
CREATE INDEX IF NOT EXISTS idx_views_ip_address ON views(ip_address);
CREATE INDEX IF NOT EXISTS idx_shares_share_type ON shares(share_type);
CREATE INDEX IF NOT EXISTS idx_feed_engagement_score ON feed_engagement(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_mention_tags_unique ON mention_tags(post_id, mentioned_user_id);

-- ===================================================================
-- ✅ NEW FEATURES SETUP COMPLETE
-- ===================================================================
-- सभी नई tables, functions और policies add हो गई हैं
-- अब user के लिए तैयार है!
-- ===================================================================
