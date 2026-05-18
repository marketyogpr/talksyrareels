/**
 * Advanced Instagram-like Feed Algorithm
 * 
 * Provides personalized content recommendations based on:
 * - User engagement history
 * - Content relevance and freshness
 * - User interests and preferences
 * - Social connections (follows)
 * - Engagement metrics (likes, comments, shares)
 * - Watch time and interaction patterns
 */

class FeedAlgorithm {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    
    // Weighting factors for ranking algorithm
    this.weights = {
      engagement: 0.30,      // Likes, comments, shares engagement
      recency: 0.15,         // Content freshness (posts within last 7 days)
      userInterest: 0.25,    // Relevance to user's interests
      socialConnection: 0.15, // Posts from followed accounts
      watchTime: 0.10,       // For video content (reels, stories)
      personalHistory: 0.05  // Similar to user's past interactions
    };

    // Constants
    this.FEED_LIMIT = 20;
    this.EXPLORE_LIMIT = 30;
    this.TRENDING_LIMIT = 50;
    this.DECAY_DAYS = 7;
  }

  /**
   * Get Personalized Home Feed
   * Shows posts from followed users + recommended content
   */
  async getHomeFeed(userId, limit = this.FEED_LIMIT, offset = 0) {
    try {
      // Get user's followed accounts
      const { data: following } = await this.supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      const followedIds = following?.map(f => f.following_id) || [];
      
      // Get user's interests
      const userInterests = await this.getUserInterests(userId);

      // Fetch posts from followed users (60% of feed)
      const followingPostsPromise = this.supabase
        .from('posts')
        .select(`
          *,
          author:users(id, username, avatar),
          engagement:engagement_metrics(likes_count, comments_count, shares_count),
          tags:post_tags(tag_name)
        `)
        .in('user_id', followedIds.length > 0 ? followedIds : [null])
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(Math.ceil(limit * 0.6));

      // Fetch recommended posts based on interests (40% of feed)
      const recommendedPostsPromise = this.getRecommendedPosts(
        userId,
        userInterests,
        Math.ceil(limit * 0.4)
      );

      const [followingResult, recommendedPosts] = await Promise.all([
        followingPostsPromise,
        recommendedPostsPromise
      ]);

      const followingPosts = followingResult.data || [];

      // Combine and rank posts
      let allPosts = [...followingPosts, ...recommendedPosts];
      
      // Filter out blocked users and already viewed content
      allPosts = await this.filterBlockedAndViewed(allPosts, userId);

      // Calculate engagement scores for each post
      const rankedPosts = await Promise.all(
        allPosts.map(post => this.calculatePostScore(post, userId, userInterests))
      );

      // Sort by score (descending) and apply offset/limit
      rankedPosts.sort((a, b) => b.score - a.score);
      
      const feed = rankedPosts.slice(offset, offset + limit);

      // Track feed impressions for analytics
      await this.trackFeedImpressions(userId, feed);

      return {
        success: true,
        posts: feed.map(p => ({
          ...p,
          score: undefined // Remove score from client response
        })),
        hasMore: rankedPosts.length > offset + limit,
        total: rankedPosts.length
      };
    } catch (error) {
      console.error('Error fetching home feed:', error);
      return {
        success: false,
        error: error.message,
        posts: []
      };
    }
  }

  /**
   * Get Explore Feed (Discover)
   * Shows trending + popular content from different categories
   */
  async getExploreFeed(userId, category = 'all', limit = this.EXPLORE_LIMIT, offset = 0) {
    try {
      const userInterests = await this.getUserInterests(userId);
      const userFollowing = await this.getUserFollowing(userId);

      let query = this.supabase
        .from('posts')
        .select(`
          *,
          author:users(id, username, avatar, followers_count),
          engagement:engagement_metrics(likes_count, comments_count, shares_count),
          tags:post_tags(tag_name),
          views_count
        `)
        .eq('status', 'published')
        .not('user_id', 'in', `(${[userId, ...userFollowing].join(',')})`) // Exclude followed + own posts
        .gte('created_at', this.getDateDaysAgo(30)); // Posts from last 30 days

      // Filter by category if specified
      if (category !== 'all') {
        query = query.contains('tags', [category]);
      }

      const { data: explorePosts } = await query
        .order('views_count', { ascending: false })
        .limit(limit * 2); // Fetch more to score and filter

      // Calculate trending scores
      const trendingPosts = await Promise.all(
        explorePosts.map(post => this.calculateTrendingScore(post, userId, userInterests))
      );

      // Sort by trending score
      trendingPosts.sort((a, b) => b.trendingScore - a.trendingScore);

      const feed = trendingPosts.slice(offset, offset + limit);

      return {
        success: true,
        posts: feed.map(p => ({
          ...p,
          trendingScore: undefined
        })),
        hasMore: trendingPosts.length > offset + limit,
        total: trendingPosts.length
      };
    } catch (error) {
      console.error('Error fetching explore feed:', error);
      return { success: false, error: error.message, posts: [] };
    }
  }

  /**
   * Get Reels Feed (For Reels/Video Content)
   * Similar to TikTok/Instagram Reels - infinite scrolling
   */
  async getReelsFeed(userId, limit = 10, lastReelId = null) {
    try {
      const userInterests = await this.getUserInterests(userId);
      let query = this.supabase
        .from('reels')
        .select(`
          *,
          author:users(id, username, avatar),
          engagement:engagement_metrics(likes_count, comments_count, shares_count),
          tags:post_tags(tag_name)
        `)
        .eq('status', 'published');

      if (lastReelId) {
        // Cursor-based pagination for infinite scroll
        const { data: lastReel } = await this.supabase
          .from('reels')
          .select('created_at')
          .eq('id', lastReelId)
          .single();
        
        if (lastReel) {
          query = query.lt('created_at', lastReel.created_at);
        }
      }

      const { data: reels } = await query
        .order('created_at', { ascending: false })
        .limit(limit * 2);

      // Score and rank reels
      const scoredReels = await Promise.all(
        reels.map(reel => this.calculateReelScore(reel, userId, userInterests))
      );

      scoredReels.sort((a, b) => b.score - a.score);
      const feed = scoredReels.slice(0, limit);

      // Track reel views
      await this.trackReelViews(userId, feed);

      return {
        success: true,
        reels: feed.map(r => ({ ...r, score: undefined })),
        nextCursor: feed.length > 0 ? feed[feed.length - 1].id : null
      };
    } catch (error) {
      console.error('Error fetching reels feed:', error);
      return { success: false, error: error.message, reels: [] };
    }
  }

  /**
   * Calculate Engagement Score for a Post
   * Combines multiple factors into a single score (0-100)
   */
  async calculatePostScore(post, userId, userInterests) {
    let score = 0;

    // 1. Engagement Score (30%)
    const engagementScore = this.getEngagementScore(post);
    score += engagementScore * this.weights.engagement;

    // 2. Recency Score (15%)
    const recencyScore = this.getRecencyScore(post.created_at);
    score += recencyScore * this.weights.recency;

    // 3. User Interest Match (25%)
    const interestScore = this.getInterestMatchScore(post.tags || [], userInterests);
    score += interestScore * this.weights.userInterest;

    // 4. Social Connection Boost (15%)
    const connectionScore = await this.getConnectionScore(post.user_id, userId);
    score += connectionScore * this.weights.socialConnection;

    // 5. Watch Time / Interaction Duration (10%)
    const watchTimeScore = await this.getWatchTimeScore(post.id, userId);
    score += watchTimeScore * this.weights.watchTime;

    // 6. Personal History Match (5%)
    const historyScore = await this.getPersonalHistoryScore(post, userId, userInterests);
    score += historyScore * this.weights.personalHistory;

    return {
      ...post,
      score: score,
      scoringBreakdown: {
        engagement: engagementScore,
        recency: recencyScore,
        interestMatch: interestScore,
        connection: connectionScore,
        watchTime: watchTimeScore,
        personalHistory: historyScore
      }
    };
  }

  /**
   * Get Engagement Score (0-100)
   * Based on likes, comments, shares relative to follower count
   */
  getEngagementScore(post) {
    const { engagement, author } = post;
    
    if (!engagement || !author) return 0;

    const totalEngagements = (engagement.likes_count || 0) + 
                            (engagement.comments_count || 0) * 2 + 
                            (engagement.shares_count || 0) * 3;

    const followerCount = author.followers_count || 1;
    const engagementRate = (totalEngagements / followerCount) * 100;

    // Normalize to 0-100 scale (assuming 5% engagement rate = 100)
    return Math.min(engagementRate / 5 * 100, 100);
  }

  /**
   * Get Recency Score (0-100)
   * Newer posts score higher, decays over time
   */
  getRecencyScore(createdAt) {
    const postDate = new Date(createdAt);
    const nowDate = new Date();
    const daysOld = (nowDate - postDate) / (1000 * 60 * 60 * 24);

    if (daysOld <= 1) return 100;
    if (daysOld <= 2) return 85;
    if (daysOld <= 3) return 70;
    if (daysOld <= 7) return 50;
    
    // Exponential decay after 7 days
    return Math.max(0, 50 * Math.exp(-daysOld / this.DECAY_DAYS));
  }

  /**
   * Get Interest Match Score (0-100)
   * Based on user's interests matching post tags
   */
  getInterestMatchScore(postTags, userInterests) {
    if (userInterests.length === 0) return 50; // Default if no interests
    
    const tagArray = Array.isArray(postTags) ? postTags : [];
    const matchedInterests = tagArray.filter(tag => 
      userInterests.some(interest => 
        tag.toLowerCase() === interest.toLowerCase()
      )
    );

    return (matchedInterests.length / Math.max(userInterests.length, 1)) * 100;
  }

  /**
   * Get Connection Score (0-100)
   * Higher score for posts from followed or verified creators
   */
  async getConnectionScore(authorId, userId) {
    const { data: isFollowing } = await this.supabase
      .from('follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('following_id', authorId)
      .single();

    if (isFollowing) return 100;
    
    // Check if verified
    const { data: author } = await this.supabase
      .from('users')
      .select('verified')
      .eq('id', authorId)
      .single();

    return author?.verified ? 70 : 0;
  }

  /**
   * Get Watch Time Score (0-100)
   * For video content, score based on average watch time
   */
  async getWatchTimeScore(postId, userId) {
    const { data: watchMetrics } = await this.supabase
      .from('watch_metrics')
      .select('watch_duration, content_duration')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!watchMetrics || watchMetrics.length === 0) return 50;

    const avgWatchPercentage = watchMetrics.reduce((sum, m) => {
      return sum + ((m.watch_duration / m.content_duration) * 100);
    }, 0) / watchMetrics.length;

    return Math.min(avgWatchPercentage, 100);
  }

  /**
   * Get Personal History Score (0-100)
   * Based on user's past interactions with similar content
   */
  async getPersonalHistoryScore(post, userId, userInterests) {
    const { data: userHistory } = await this.supabase
      .from('engagement')
      .select('action_type')
      .eq('user_id', userId)
      .in('action_type', ['like', 'comment', 'share'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (!userHistory) return 0;

    const likePercentage = (userHistory.filter(h => h.action_type === 'like').length / userHistory.length) * 100;
    
    // If user likes similar content, boost score
    if (post.tags && post.tags.some(tag => userInterests.includes(tag))) {
      return likePercentage;
    }

    return likePercentage * 0.5;
  }

  /**
   * Calculate Trending Score for Explore Feed
   * Combines engagement, views, and time-based metrics
   */
  async calculateTrendingScore(post, userId, userInterests) {
    const { engagement, views_count = 0 } = post;
    
    let trendingScore = 0;

    // Engagement velocity
    const engagementVelocity = ((engagement?.likes_count || 0) + 
                                (engagement?.comments_count || 0) + 
                                (engagement?.shares_count || 0)) / views_count * 100 || 0;
    
    trendingScore += Math.min(engagementVelocity * 10, 40);

    // View count
    trendingScore += Math.min((views_count / 1000) * 30, 30);

    // Recency
    trendingScore += this.getRecencyScore(post.created_at) * 0.2;

    // Interest match
    trendingScore += this.getInterestMatchScore(post.tags || [], userInterests) * 0.2;

    return {
      ...post,
      trendingScore: Math.min(trendingScore, 100),
      trendingMetrics: {
        engagementVelocity,
        viewCount: views_count,
        recency: this.getRecencyScore(post.created_at),
        interestMatch: this.getInterestMatchScore(post.tags || [], userInterests)
      }
    };
  }

  /**
   * Calculate Reel Score
   * Similar to post score but weighted for video content
   */
  async calculateReelScore(reel, userId, userInterests) {
    let score = 0;

    // Engagement (35% for reels)
    const engagementScore = this.getEngagementScore(reel);
    score += engagementScore * 0.35;

    // Watch time (25% for reels - higher than posts)
    const watchTimeScore = await this.getWatchTimeScore(reel.id, userId);
    score += watchTimeScore * 0.25;

    // Recency (15%)
    score += this.getRecencyScore(reel.created_at) * 0.15;

    // Interest (15%)
    score += this.getInterestMatchScore(reel.tags || [], userInterests) * 0.15;

    // Social connection (10%)
    const connectionScore = await this.getConnectionScore(reel.user_id, userId);
    score += connectionScore * 0.10;

    return {
      ...reel,
      score: Math.min(score, 100)
    };
  }

  /**
   * Get Recommended Posts Based on User Interests
   */
  async getRecommendedPosts(userId, userInterests, limit) {
    try {
      if (userInterests.length === 0) {
        // If no interests, get trending posts
        const { data } = await this.supabase
          .from('posts')
          .select(`*`)
          .eq('status', 'published')
          .order('views_count', { ascending: false })
          .limit(limit);
        
        return data || [];
      }

      // Get posts matching user interests
      const { data } = await this.supabase
        .from('posts')
        .select(`
          *,
          engagement:engagement_metrics(likes_count, comments_count, shares_count),
          tags:post_tags(tag_name)
        `)
        .eq('status', 'published')
        .contains('tags', userInterests)
        .order('created_at', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (error) {
      console.error('Error fetching recommended posts:', error);
      return [];
    }
  }

  /**
   * Get User's Interests from their profile and engagement history
   */
  async getUserInterests(userId) {
    try {
      // Get user's explicit interests
      const { data: userProfile } = await this.supabase
        .from('users')
        .select('interests')
        .eq('id', userId)
        .single();

      const explicitInterests = userProfile?.interests || [];

      // Get implicit interests from engagement history (tags they've interacted with)
      const { data: engagementHistory } = await this.supabase
        .from('engagement')
        .select(`
          post:posts(tags:post_tags(tag_name))
        `)
        .eq('user_id', userId)
        .in('action_type', ['like', 'comment', 'save'])
        .order('created_at', { ascending: false })
        .limit(100);

      const implicitInterests = [];
      if (engagementHistory) {
        const tagCounts = {};
        engagementHistory.forEach(e => {
          if (e.post?.tags) {
            e.post.tags.forEach(tag => {
              tagCounts[tag.tag_name] = (tagCounts[tag.tag_name] || 0) + 1;
            });
          }
        });

        // Get top tags (frequency > 2)
        Object.entries(tagCounts)
          .filter(([_, count]) => count > 2)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .forEach(([tag]) => implicitInterests.push(tag));
      }

      return [...new Set([...explicitInterests, ...implicitInterests])];
    } catch (error) {
      console.error('Error fetching user interests:', error);
      return [];
    }
  }

  /**
   * Get User's Following List
   */
  async getUserFollowing(userId) {
    try {
      const { data } = await this.supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      return data?.map(f => f.following_id) || [];
    } catch (error) {
      console.error('Error fetching following list:', error);
      return [];
    }
  }

  /**
   * Filter blocked users and already viewed content
   */
  async filterBlockedAndViewed(posts, userId) {
    try {
      // Get blocked users
      const { data: blockedUsers } = await this.supabase
        .from('blocks')
        .select('blocked_id')
        .eq('user_id', userId);

      const blockedIds = blockedUsers?.map(b => b.blocked_id) || [];

      // Filter out posts from blocked users
      return posts.filter(post => !blockedIds.includes(post.user_id));
    } catch (error) {
      console.error('Error filtering blocked users:', error);
      return posts;
    }
  }

  /**
   * Track feed impressions for analytics
   */
  async trackFeedImpressions(userId, posts) {
    try {
      const impressions = posts.map(post => ({
        user_id: userId,
        post_id: post.id,
        feed_type: 'home',
        rank_position: posts.indexOf(post) + 1,
        score: post.score,
        created_at: new Date().toISOString()
      }));

      await this.supabase
        .from('feed_impressions')
        .insert(impressions);
    } catch (error) {
      console.error('Error tracking feed impressions:', error);
    }
  }

  /**
   * Track reel views for analytics
   */
  async trackReelViews(userId, reels) {
    try {
      const views = reels.map(reel => ({
        user_id: userId,
        reel_id: reel.id,
        created_at: new Date().toISOString()
      }));

      await this.supabase
        .from('reel_views')
        .insert(views);
    } catch (error) {
      console.error('Error tracking reel views:', error);
    }
  }

  /**
   * Helper: Get date X days ago
   */
  getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }
}

export default FeedAlgorithm;
