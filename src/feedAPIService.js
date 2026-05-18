/**
 * Feed API Service
 * 
 * REST API endpoints for:
 * - Feed retrieval (home, explore, reels, trending)
 * - Engagement tracking (likes, comments, shares)
 * - User interests management
 * - Analytics and metrics
 */

import FeedAlgorithm from './feedAlgorithm.js';
import EngagementTracker from './engagementTracker.js';

class FeedAPIService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.feedAlgorithm = new FeedAlgorithm(supabaseClient);
    this.engagementTracker = new EngagementTracker(supabaseClient);
  }

  /**
   * Route request to appropriate handler
   */
  async handleRequest(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // Parse query parameters
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    const userId = url.searchParams.get('user_id');
    const category = url.searchParams.get('category') || 'all';

    try {
      // FEED ENDPOINTS
      if (pathname === '/api/feed/home' && method === 'GET') {
        return await this.getHomeFeed(userId, limit, offset);
      }

      if (pathname === '/api/feed/explore' && method === 'GET') {
        return await this.getExploreFeed(userId, category, limit, offset);
      }

      if (pathname === '/api/feed/reels' && method === 'GET') {
        return await this.getReelsFeed(userId, limit);
      }

      if (pathname === '/api/feed/trending' && method === 'GET') {
        return await this.getTrendingFeed(limit);
      }

      if (pathname === '/api/feed/saved' && method === 'GET') {
        return await this.getSavedPosts(userId, limit, offset);
      }

      // ENGAGEMENT ENDPOINTS
      if (pathname === '/api/engagement/like' && method === 'POST') {
        const body = await request.json();
        return await this.handleLike(body.user_id, body.post_id, body.is_like);
      }

      if (pathname === '/api/engagement/comment' && method === 'POST') {
        const body = await request.json();
        return await this.handleComment(
          body.user_id,
          body.post_id,
          body.text,
          body.parent_comment_id
        );
      }

      if (pathname === '/api/engagement/share' && method === 'POST') {
        const body = await request.json();
        return await this.handleShare(body.user_id, body.post_id, body.method);
      }

      if (pathname === '/api/engagement/save' && method === 'POST') {
        const body = await request.json();
        return await this.handleSave(body.user_id, body.post_id, body.is_save);
      }

      if (pathname === '/api/engagement/view' && method === 'POST') {
        const body = await request.json();
        return await this.handleView(body.user_id, body.post_id, body.duration);
      }

      if (pathname === '/api/engagement/watch' && method === 'POST') {
        const body = await request.json();
        return await this.handleWatchTime(
          body.user_id,
          body.reel_id,
          body.watch_duration,
          body.total_duration
        );
      }

      if (pathname === '/api/engagement/report' && method === 'POST') {
        const body = await request.json();
        return await this.handleReport(
          body.user_id,
          body.post_id,
          body.reason,
          body.details
        );
      }

      if (pathname === '/api/engagement/block' && method === 'POST') {
        const body = await request.json();
        return await this.handleBlock(body.user_id, body.blocked_user_id);
      }

      // STATS ENDPOINTS
      if (pathname === '/api/stats/user-engagement' && method === 'GET') {
        return await this.getUserEngagementStats(userId);
      }

      if (pathname === '/api/stats/post' && method === 'GET') {
        const postId = url.searchParams.get('post_id');
        return await this.getPostStats(postId);
      }

      if (pathname === '/api/stats/trending' && method === 'GET') {
        return await this.getTrendingStats(limit);
      }

      // USER INTERESTS ENDPOINTS
      if (pathname === '/api/interests/get' && method === 'GET') {
        return await this.getUserInterests(userId);
      }

      if (pathname === '/api/interests/update' && method === 'POST') {
        const body = await request.json();
        return await this.updateUserInterests(body.user_id, body.interests);
      }

      if (pathname === '/api/interests/suggestions' && method === 'GET') {
        return await this.getInterestSuggestions(userId);
      }

      // RECOMMENDATION ENDPOINTS
      if (pathname === '/api/recommendations/discover' && method === 'GET') {
        return await this.getDiscoverRecommendations(userId, limit);
      }

      if (pathname === '/api/recommendations/similar' && method === 'GET') {
        const postId = url.searchParams.get('post_id');
        return await this.getSimilarPosts(postId, userId, limit);
      }

      // Default 404
      return this.jsonResponse({ error: 'Not Found' }, 404);
    } catch (error) {
      console.error('API Error:', error);
      return this.jsonResponse({ error: error.message }, 500);
    }
  }

  // ============= FEED HANDLERS =============

  async getHomeFeed(userId, limit, offset) {
    const result = await this.feedAlgorithm.getHomeFeed(userId, limit, offset);
    return this.jsonResponse(result);
  }

  async getExploreFeed(userId, category, limit, offset) {
    const result = await this.feedAlgorithm.getExploreFeed(userId, category, limit, offset);
    return this.jsonResponse(result);
  }

  async getReelsFeed(userId, limit) {
    const result = await this.feedAlgorithm.getReelsFeed(userId, limit);
    return this.jsonResponse(result);
  }

  async getTrendingFeed(limit) {
    try {
      const { data: posts } = await this.supabase
        .from('engagement_metrics')
        .select(`
          *,
          post:posts(
            *,
            author:users(id, username, avatar)
          )
        `)
        .order('engagement_velocity', { ascending: false })
        .limit(limit);

      return this.jsonResponse({
        success: true,
        trending: posts || [],
        total: posts?.length || 0
      });
    } catch (error) {
      return this.jsonResponse({ success: false, error: error.message }, 500);
    }
  }

  async getSavedPosts(userId, limit, offset) {
    try {
      const { data: saved } = await this.supabase
        .from('engagement')
        .select(`
          post:posts(
            *,
            author:users(id, username, avatar)
          )
        `)
        .eq('user_id', userId)
        .eq('action_type', 'save')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      return this.jsonResponse({
        success: true,
        posts: saved?.map(s => s.post) || [],
        hasMore: saved?.length === limit,
        total: saved?.length || 0
      });
    } catch (error) {
      return this.jsonResponse({ success: false, error: error.message }, 500);
    }
  }

  // ============= ENGAGEMENT HANDLERS =============

  async handleLike(userId, postId, isLike) {
    const result = await this.engagementTracker.trackLike(userId, postId, isLike);
    return this.jsonResponse(result);
  }

  async handleComment(userId, postId, text, parentCommentId) {
    const result = await this.engagementTracker.trackComment(userId, postId, text, parentCommentId);
    return this.jsonResponse(result);
  }

  async handleShare(userId, postId, method) {
    const result = await this.engagementTracker.trackShare(userId, postId, method);
    return this.jsonResponse(result);
  }

  async handleSave(userId, postId, isSave) {
    const result = await this.engagementTracker.trackSave(userId, postId, isSave);
    return this.jsonResponse(result);
  }

  async handleView(userId, postId, duration) {
    const result = await this.engagementTracker.trackView(userId, postId, duration);
    return this.jsonResponse(result);
  }

  async handleWatchTime(userId, reelId, watchDuration, totalDuration) {
    const result = await this.engagementTracker.trackWatchTime(userId, reelId, watchDuration, totalDuration);
    return this.jsonResponse(result);
  }

  async handleReport(userId, postId, reason, details) {
    const result = await this.engagementTracker.trackReport(userId, postId, reason, details);
    return this.jsonResponse(result);
  }

  async handleBlock(userId, blockedUserId) {
    const result = await this.engagementTracker.trackBlock(userId, blockedUserId);
    return this.jsonResponse(result);
  }

  // ============= STATS HANDLERS =============

  async getUserEngagementStats(userId) {
    const result = await this.engagementTracker.getUserEngagementStats(userId);
    return this.jsonResponse(result);
  }

  async getPostStats(postId) {
    const result = await this.engagementTracker.getPostEngagementStats(postId);
    return this.jsonResponse(result);
  }

  async getTrendingStats(limit) {
    const result = await this.engagementTracker.getTrendingContent(limit);
    return this.jsonResponse(result);
  }

  // ============= USER INTERESTS HANDLERS =============

  async getUserInterests(userId) {
    try {
      const interests = await this.feedAlgorithm.getUserInterests(userId);
      return this.jsonResponse({
        success: true,
        interests: interests
      });
    } catch (error) {
      return this.jsonResponse({ success: false, error: error.message }, 500);
    }
  }

  async updateUserInterests(userId, interests) {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({ interests: interests })
        .eq('id', userId);

      if (error) throw error;

      return this.jsonResponse({
        success: true,
        message: 'Interests updated',
        interests: interests
      });
    } catch (error) {
      return this.jsonResponse({ success: false, error: error.message }, 500);
    }
  }

  async getInterestSuggestions(userId) {
    try {
      const userInterests = await this.feedAlgorithm.getUserInterests(userId);

      // Get trending tags
      const { data: trendingTags } = await this.supabase
        .from('post_tags')
        .select('tag_name')
        .order('usage_count', { ascending: false })
        .limit(30);

      // Filter out already followed interests
      const suggestions = trendingTags
        ?.filter(t => !userInterests.includes(t.tag_name))
        .map(t => t.tag_name)
        .slice(0, 10) || [];

      return this.jsonResponse({
        success: true,
        suggestions: suggestions
      });
    } catch (error) {
      return this.jsonResponse({ success: false, error: error.message }, 500);
    }
  }

  // ============= RECOMMENDATION HANDLERS =============

  async getDiscoverRecommendations(userId, limit) {
    try {
      const userInterests = await this.feedAlgorithm.getUserInterests(userId);
      const recommended = await this.feedAlgorithm.getRecommendedPosts(userId, userInterests, limit);

      return this.jsonResponse({
        success: true,
        recommended: recommended
      });
    } catch (error) {
      return this.jsonResponse({ success: false, error: error.message }, 500);
    }
  }

  async getSimilarPosts(postId, userId, limit) {
    try {
      // Get original post
      const { data: originalPost } = await this.supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (!originalPost) {
        return this.jsonResponse({ error: 'Post not found' }, 404);
      }

      // Get similar posts based on tags
      const { data: similarPosts } = await this.supabase
        .from('posts')
        .select(`
          *,
          author:users(id, username, avatar)
        `)
        .contains('tags', originalPost.tags)
        .neq('id', postId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return this.jsonResponse({
        success: true,
        similar: similarPosts || []
      });
    } catch (error) {
      return this.jsonResponse({ success: false, error: error.message }, 500);
    }
  }

  // ============= HELPERS =============

  jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status: status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
}

export default FeedAPIService;
