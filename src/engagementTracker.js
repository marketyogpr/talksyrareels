/**
 * Engagement Tracking Module
 * 
 * Tracks all user interactions:
 * - Likes, Comments, Shares
 * - Views and Watch Time
 * - Saves and Bookmarks
 * - Report/Block actions
 * 
 * Used by the feed algorithm to score and rank content
 */

class EngagementTracker {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Track Like/Unlike Action
   */
  async trackLike(userId, postId, isLike = true) {
    try {
      if (isLike) {
        // Add like
        const { error } = await this.supabase
          .from('engagement')
          .insert({
            user_id: userId,
            post_id: postId,
            action_type: 'like',
            created_at: new Date().toISOString()
          });

        if (error) throw error;

        // Increment like count
        const { data: currentMetrics } = await this.supabase
          .from('engagement_metrics')
          .select('likes_count')
          .eq('post_id', postId)
          .single();

        await this.supabase
          .from('engagement_metrics')
          .update({
            likes_count: (currentMetrics?.likes_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('post_id', postId);

      } else {
        // Remove like
        await this.supabase
          .from('engagement')
          .delete()
          .eq('user_id', userId)
          .eq('post_id', postId)
          .eq('action_type', 'like');

        // Decrement like count
        const { data: currentMetrics } = await this.supabase
          .from('engagement_metrics')
          .select('likes_count')
          .eq('post_id', postId)
          .single();

        await this.supabase
          .from('engagement_metrics')
          .update({
            likes_count: Math.max((currentMetrics?.likes_count || 1) - 1, 0),
            updated_at: new Date().toISOString()
          })
          .eq('post_id', postId);
      }

      return { success: true };
    } catch (error) {
      console.error('Error tracking like:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Track Comment Action
   */
  async trackComment(userId, postId, commentText, parentCommentId = null) {
    try {
      const { data: comment, error } = await this.supabase
        .from('comments')
        .insert({
          user_id: userId,
          post_id: postId,
          parent_comment_id: parentCommentId,
          text: commentText,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Increment comment count
      const { data: currentMetrics } = await this.supabase
        .from('engagement_metrics')
        .select('comments_count')
        .eq('post_id', postId)
        .single();

      await this.supabase
        .from('engagement_metrics')
        .update({
          comments_count: (currentMetrics?.comments_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('post_id', postId);

      // Track engagement
      await this.supabase
        .from('engagement')
        .insert({
          user_id: userId,
          post_id: postId,
          action_type: 'comment',
          created_at: new Date().toISOString()
        });

      return { success: true, comment };
    } catch (error) {
      console.error('Error tracking comment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Track Share Action
   */
  async trackShare(userId, postId, shareMethod = 'direct') {
    try {
      const { error } = await this.supabase
        .from('engagement')
        .insert({
          user_id: userId,
          post_id: postId,
          action_type: 'share',
          metadata: { method: shareMethod },
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Increment share count
      const { data: currentMetrics } = await this.supabase
        .from('engagement_metrics')
        .select('shares_count')
        .eq('post_id', postId)
        .single();

      await this.supabase
        .from('engagement_metrics')
        .update({
          shares_count: (currentMetrics?.shares_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('post_id', postId);

      return { success: true };
    } catch (error) {
      console.error('Error tracking share:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Track View/Impression
   */
  async trackView(userId, postId, viewDuration = 0) {
    try {
      // Track engagement
      await this.supabase
        .from('engagement')
        .insert({
          user_id: userId,
          post_id: postId,
          action_type: 'view',
          metadata: { duration_seconds: viewDuration },
          created_at: new Date().toISOString()
        });

      // Increment view count
      const { data: currentMetrics } = await this.supabase
        .from('engagement_metrics')
        .select('views_count')
        .eq('post_id', postId)
        .single();

      await this.supabase
        .from('engagement_metrics')
        .update({
          views_count: (currentMetrics?.views_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('post_id', postId);

      return { success: true };
    } catch (error) {
      console.error('Error tracking view:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Track Watch Time for Video Content (Reels/Stories)
   */
  async trackWatchTime(userId, reelId, watchDuration, totalDuration) {
    try {
      const { error } = await this.supabase
        .from('watch_metrics')
        .insert({
          user_id: userId,
          reel_id: reelId,
          watch_duration: watchDuration,
          content_duration: totalDuration,
          watch_percentage: (watchDuration / totalDuration) * 100,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // If user watched > 80%, count as full view
      if ((watchDuration / totalDuration) * 100 > 80) {
        await this.trackView(userId, reelId, watchDuration);
      }

      return { success: true };
    } catch (error) {
      console.error('Error tracking watch time:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Track Save/Bookmark Action
   */
  async trackSave(userId, postId, isSave = true) {
    try {
      if (isSave) {
        await this.supabase
          .from('engagement')
          .insert({
            user_id: userId,
            post_id: postId,
            action_type: 'save',
            created_at: new Date().toISOString()
          });

        // Increment save count
        const { data: currentMetrics } = await this.supabase
          .from('engagement_metrics')
          .select('saves_count')
          .eq('post_id', postId)
          .single();

        await this.supabase
          .from('engagement_metrics')
          .update({
            saves_count: (currentMetrics?.saves_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('post_id', postId);
      } else {
        await this.supabase
          .from('engagement')
          .delete()
          .eq('user_id', userId)
          .eq('post_id', postId)
          .eq('action_type', 'save');

        // Decrement save count
        const { data: currentMetrics } = await this.supabase
          .from('engagement_metrics')
          .select('saves_count')
          .eq('post_id', postId)
          .single();

        await this.supabase
          .from('engagement_metrics')
          .update({
            saves_count: Math.max((currentMetrics?.saves_count || 1) - 1, 0),
            updated_at: new Date().toISOString()
          })
          .eq('post_id', postId);
      }

      return { success: true };
    } catch (error) {
      console.error('Error tracking save:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Track Report/Flag Action
   */
  async trackReport(userId, postId, reason, details = '') {
    try {
      const { error } = await this.supabase
        .from('reports')
        .insert({
          user_id: userId,
          post_id: postId,
          reason: reason,
          details: details,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error tracking report:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Track Block Action
   */
  async trackBlock(userId, blockedUserId) {
    try {
      const { error } = await this.supabase
        .from('blocks')
        .insert({
          user_id: userId,
          blocked_id: blockedUserId,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error tracking block:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get User Engagement Statistics
   */
  async getUserEngagementStats(userId) {
    try {
      const { data: stats, error } = await this.supabase
        .from('engagement')
        .select('action_type')
        .eq('user_id', userId);

      if (error) throw error;

      const breakdown = {
        total: stats?.length || 0,
        likes: stats?.filter(s => s.action_type === 'like').length || 0,
        comments: stats?.filter(s => s.action_type === 'comment').length || 0,
        shares: stats?.filter(s => s.action_type === 'share').length || 0,
        views: stats?.filter(s => s.action_type === 'view').length || 0,
        saves: stats?.filter(s => s.action_type === 'save').length || 0
      };

      return { success: true, stats: breakdown };
    } catch (error) {
      console.error('Error fetching engagement stats:', error);
      return { success: false, error: error.message, stats: {} };
    }
  }

  /**
   * Get Post Engagement Statistics
   */
  async getPostEngagementStats(postId) {
    try {
      const { data: metrics, error } = await this.supabase
        .from('engagement_metrics')
        .select('*')
        .eq('post_id', postId)
        .single();

      if (error) throw error;

      const totalEngagement = (metrics?.likes_count || 0) + 
                             (metrics?.comments_count || 0) + 
                             (metrics?.shares_count || 0) + 
                             (metrics?.saves_count || 0);

      return { 
        success: true, 
        stats: {
          ...metrics,
          total_engagement: totalEngagement,
          engagement_rate: metrics?.views_count > 0 ? 
            (totalEngagement / metrics.views_count * 100).toFixed(2) : 0
        }
      };
    } catch (error) {
      console.error('Error fetching post engagement stats:', error);
      return { success: false, error: error.message, stats: {} };
    }
  }

  /**
   * Get Trending Content
   * Posts with highest engagement in last 24 hours
   */
  async getTrendingContent(limit = 20) {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data: trending, error } = await this.supabase
        .from('engagement_metrics')
        .select(`
          *,
          post:posts(
            *,
            author:users(id, username, avatar)
          )
        `)
        .gte('updated_at', twentyFourHoursAgo.toISOString())
        .order('engagement_velocity', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, trending: trending || [] };
    } catch (error) {
      console.error('Error fetching trending content:', error);
      return { success: false, error: error.message, trending: [] };
    }
  }

  /**
   * Calculate Engagement Velocity
   * How fast engagement is growing (for trending)
   */
  async calculateEngagementVelocity(postId) {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

      const { data: oneHour } = await this.supabase
        .from('engagement')
        .select('id')
        .eq('post_id', postId)
        .gte('created_at', oneHourAgo.toISOString());

      const { data: sixHours } = await this.supabase
        .from('engagement')
        .select('id')
        .eq('post_id', postId)
        .gte('created_at', sixHoursAgo.toISOString());

      const velocity = {
        last_hour: oneHour?.length || 0,
        last_6_hours: sixHours?.length || 0,
        growth_rate: oneHour?.length > 0 ? (oneHour.length / Math.max(sixHours?.length || 1, 1)) * 100 : 0
      };

      // Update in database
      await this.supabase
        .from('engagement_metrics')
        .update({ engagement_velocity: velocity.growth_rate })
        .eq('post_id', postId);

      return { success: true, velocity };
    } catch (error) {
      console.error('Error calculating engagement velocity:', error);
      return { success: false, error: error.message };
    }
  }
}

export default EngagementTracker;
