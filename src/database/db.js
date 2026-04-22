/**
 * DATABASE MODULE - D1 Connection Helper (UPDATED SCHEMA)
 * Ye file D1 database ko manage karta hai with NEW TABLE STRUCTURES
 * Posts, Reels, Stories, Groups, Thoughts, Polls - sab kuch yahi se handle hota hai
 */

export class Database {
  constructor(env) {
    this.db = env.DB;
  }

  // ==================== POSTS TABLE ====================
  async createPost(postData) {
    const {
      id,
      user_id,
      type = 'post',
      caption,
      visibility = 'public',
      location,
      hashtags,
      mentions,
      allow_comments = 1,
      allow_shares = 1,
      is_pinned = 0,
      is_featured = 0,
      language,
      content_warning,
      scheduled_at,
      expires_at
    } = postData;

    const currentTime = new Date().toISOString();

    return this.db
      .prepare(
        `INSERT INTO posts (
          id, user_id, type, caption, visibility, location, hashtags, mentions,
          allow_comments, allow_shares, is_pinned, is_featured, language,
          content_warning, scheduled_at, expires_at,
          like_count, comment_count, share_count, view_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)`
      )
      .bind(
        id, user_id, type, caption, visibility, location, hashtags, mentions,
        allow_comments, allow_shares, is_pinned, is_featured, language,
        content_warning, scheduled_at, expires_at,
        currentTime, currentTime
      )
      .run();
  }

  async getPost(postId) {
    return this.db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .bind(postId)
      .first();
  }

  async getUserPosts(userId, limit = 20, offset = 0) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(userId, limit, offset)
      .all();
    return results;
  }

  async getFeedPosts(limit = 50, offset = 0) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM posts WHERE visibility = 'public' ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(limit, offset)
      .all();
    return results;
  }

  async updatePost(postId, updates) {
    const updateFields = [];
    const values = [];
    const currentTime = new Date().toISOString();

    // Build dynamic update query based on provided fields
    if (updates.caption !== undefined) {
      updateFields.push('caption = ?');
      values.push(updates.caption);
    }
    if (updates.visibility !== undefined) {
      updateFields.push('visibility = ?');
      values.push(updates.visibility);
    }
    if (updates.location !== undefined) {
      updateFields.push('location = ?');
      values.push(updates.location);
    }
    if (updates.hashtags !== undefined) {
      updateFields.push('hashtags = ?');
      values.push(updates.hashtags);
    }
    if (updates.mentions !== undefined) {
      updateFields.push('mentions = ?');
      values.push(updates.mentions);
    }
    if (updates.allow_comments !== undefined) {
      updateFields.push('allow_comments = ?');
      values.push(updates.allow_comments);
    }
    if (updates.allow_shares !== undefined) {
      updateFields.push('allow_shares = ?');
      values.push(updates.allow_shares);
    }
    if (updates.is_pinned !== undefined) {
      updateFields.push('is_pinned = ?');
      values.push(updates.is_pinned);
    }
    if (updates.is_featured !== undefined) {
      updateFields.push('is_featured = ?');
      values.push(updates.is_featured);
    }
    if (updates.language !== undefined) {
      updateFields.push('language = ?');
      values.push(updates.language);
    }
    if (updates.content_warning !== undefined) {
      updateFields.push('content_warning = ?');
      values.push(updates.content_warning);
    }
    if (updates.scheduled_at !== undefined) {
      updateFields.push('scheduled_at = ?');
      values.push(updates.scheduled_at);
    }
    if (updates.expires_at !== undefined) {
      updateFields.push('expires_at = ?');
      values.push(updates.expires_at);
    }
    if (updates.edited_at !== undefined) {
      updateFields.push('edited_at = ?');
      values.push(updates.edited_at);
    } else {
      // If not explicitly set, update edited_at when post is modified
      updateFields.push('edited_at = ?');
      values.push(currentTime);
    }

    // Always update the updated_at timestamp
    updateFields.push('updated_at = ?');
    values.push(currentTime);

    // Add the WHERE clause
    values.push(postId);

    const sql = `UPDATE posts SET ${updateFields.join(', ')} WHERE id = ?`;

    return this.db.prepare(sql).bind(...values).run();
  }

  async deletePost(postId) {
    return this.db
      .prepare("DELETE FROM posts WHERE id = ?")
      .bind(postId)
      .run();
  }

  async incrementPostViews(postId) {
    return this.db
      .prepare("UPDATE posts SET view_count = view_count + 1 WHERE id = ?")
      .bind(postId)
      .run();
  }

  async updatePostCounts(postId, likeCount, commentCount, shareCount) {
    return this.db
      .prepare(
        `UPDATE posts SET like_count = ?, comment_count = ?, share_count = ? WHERE id = ?`
      )
      .bind(likeCount, commentCount, shareCount, postId)
      .run();
  }

  // ==================== REELS TABLE ====================
  async createReel(id, postId, videoUrl, thumbnailUrl, duration, width, height) {
    return this.db
      .prepare(
        `INSERT INTO reels (id, post_id, video_url, thumbnail_url, duration, width, height, view_count, like_count, comment_count, share_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)`
      )
      .bind(id, postId, videoUrl, thumbnailUrl, duration, width, height, new Date().toISOString(), new Date().toISOString())
      .run();
  }

  async getReel(reelId) {
    return this.db
      .prepare("SELECT * FROM reels WHERE id = ?")
      .bind(reelId)
      .first();
  }

  async getReelByPost(postId) {
    return this.db
      .prepare("SELECT * FROM reels WHERE post_id = ?")
      .bind(postId)
      .first();
  }

  async updateReelAudio(reelId, audioName, audioUrl) {
    return this.db
      .prepare(
        `UPDATE reels SET audio_name = ?, audio_url = ?, updated_at = ? WHERE id = ?`
      )
      .bind(audioName, audioUrl, new Date().toISOString(), reelId)
      .run();
  }

  // ==================== STORIES TABLE ====================
  async createStory(id, userId, mediaUrl, mediaType, thumbnailUrl, duration, caption, expiresAt) {
    return this.db
      .prepare(
        `INSERT INTO stories (id, user_id, media_url, media_type, thumbnail_url, duration, caption, view_count, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
      )
      .bind(id, userId, mediaUrl, mediaType, thumbnailUrl, duration, caption, expiresAt, new Date().toISOString())
      .run();
  }

  async getStory(storyId) {
    return this.db
      .prepare("SELECT * FROM stories WHERE id = ?")
      .bind(storyId)
      .first();
  }

  async getUserStories(userId) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM stories WHERE user_id = ? AND datetime(expires_at) > datetime('now') ORDER BY created_at DESC`
      )
      .bind(userId)
      .all();
    return results;
  }

  async deleteExpiredStories() {
    return this.db
      .prepare("DELETE FROM stories WHERE datetime(expires_at) < datetime('now')")
      .run();
  }

  // ==================== STORY VIEWS ====================
  async addStoryView(id, storyId, userId) {
    return this.db
      .prepare(
        `INSERT INTO story_views (id, story_id, user_id, created_at) VALUES (?, ?, ?, ?)`
      )
      .bind(id, storyId, userId, new Date().toISOString())
      .run();
  }

  async getStoryViewers(storyId) {
    const { results } = await this.db
      .prepare("SELECT * FROM story_views WHERE story_id = ? ORDER BY created_at DESC")
      .bind(storyId)
      .all();
    return results;
  }

  // ==================== GROUPS TABLE ====================
  async createGroup(id, name, description, image, createdBy, isPrivate = 0) {
    return this.db
      .prepare(
        `INSERT INTO groups (id, name, description, image, created_by, is_private, member_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .bind(id, name, description, image, createdBy, isPrivate, new Date().toISOString(), new Date().toISOString())
      .run();
  }

  async getGroup(groupId) {
    return this.db
      .prepare("SELECT * FROM groups WHERE id = ?")
      .bind(groupId)
      .first();
  }

  async updateGroup(groupId, name, description, image) {
    return this.db
      .prepare(
        `UPDATE groups SET name = ?, description = ?, image = ?, updated_at = ? WHERE id = ?`
      )
      .bind(name, description, image, new Date().toISOString(), groupId)
      .run();
  }

  async deleteGroup(groupId) {
    return this.db
      .prepare("DELETE FROM groups WHERE id = ?")
      .bind(groupId)
      .run();
  }

  // ==================== GROUP MEMBERS ====================
  async addGroupMember(id, groupId, userId, role = 'member') {
    return this.db
      .prepare(
        `INSERT INTO group_members (id, group_id, user_id, role, status, joined_at)
         VALUES (?, ?, ?, ?, 'active', ?)`
      )
      .bind(id, groupId, userId, role, new Date().toISOString())
      .run();
  }

  async removeGroupMember(groupId, userId) {
    return this.db
      .prepare(
        `UPDATE group_members SET status = 'inactive', left_at = ? WHERE group_id = ? AND user_id = ?`
      )
      .bind(new Date().toISOString(), groupId, userId)
      .run();
  }

  async getGroupMembers(groupId) {
    const { results } = await this.db
      .prepare("SELECT * FROM group_members WHERE group_id = ? AND status = 'active'")
      .bind(groupId)
      .all();
    return results;
  }

  // ==================== THOUGHTS TABLE ====================
  async createThought(id, postId, text) {
    return this.db
      .prepare(
        `INSERT INTO thoughts (id, post_id, text, reply_count, like_count, repost_count, view_count, is_edited, is_deleted, created_at, updated_at)
         VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0, ?, ?)`
      )
      .bind(id, postId, text, new Date().toISOString(), new Date().toISOString())
      .run();
  }

  async getThought(thoughtId) {
    return this.db
      .prepare("SELECT * FROM thoughts WHERE id = ? AND is_deleted = 0")
      .bind(thoughtId)
      .first();
  }

  async getPostThoughts(postId, limit = 20, offset = 0) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM thoughts WHERE post_id = ? AND is_deleted = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(postId, limit, offset)
      .all();
    return results;
  }

  async updateThought(thoughtId, text) {
    return this.db
      .prepare(
        `UPDATE thoughts SET text = ?, is_edited = 1, updated_at = ? WHERE id = ?`
      )
      .bind(text, new Date().toISOString(), thoughtId)
      .run();
  }

  async deleteThought(thoughtId) {
    return this.db
      .prepare(
        `UPDATE thoughts SET is_deleted = 1, updated_at = ? WHERE id = ?`
      )
      .bind(new Date().toISOString(), thoughtId)
      .run();
  }

  // ==================== POLLS TABLE ====================
  async createPoll(id, postId, question, expiresAt, isMultiple = 0) {
    return this.db
      .prepare(
        `INSERT INTO polls (id, post_id, question, total_votes, expires_at, is_multiple, created_at)
         VALUES (?, ?, ?, 0, ?, ?, ?)`
      )
      .bind(id, postId, question, expiresAt, isMultiple, new Date().toISOString())
      .run();
  }

  async getPoll(pollId) {
    return this.db
      .prepare("SELECT * FROM polls WHERE id = ?")
      .bind(pollId)
      .first();
  }

  async createPollOption(id, pollId, optionText) {
    return this.db
      .prepare(
        `INSERT INTO poll_options (id, poll_id, option_text, vote_count) VALUES (?, ?, ?, 0)`
      )
      .bind(id, pollId, optionText)
      .run();
  }

  async getPollOptions(pollId) {
    const { results } = await this.db
      .prepare("SELECT * FROM poll_options WHERE poll_id = ? ORDER BY vote_count DESC")
      .bind(pollId)
      .all();
    return results;
  }

  async castPollVote(id, pollId, userId, optionId) {
    return this.db
      .prepare(
        `INSERT INTO poll_votes (id, poll_id, user_id, option_id, created_at) VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id, pollId, userId, optionId, new Date().toISOString())
      .run();
  }

  async getPollVotes(pollId) {
    const { results } = await this.db
      .prepare("SELECT * FROM poll_votes WHERE poll_id = ?")
      .bind(pollId)
      .all();
    return results;
  }

  // ==================== NOTIFICATIONS ====================
  async createNotification(id, userId, actorId, type, entityId, text) {
    return this.db
      .prepare(
        `INSERT INTO notifications (id, user_id, actor_id, type, entity_id, text, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
      )
      .bind(id, userId, actorId, type, entityId, text, new Date().toISOString())
      .run();
  }

  async getUserNotifications(userId, limit = 20, offset = 0) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(userId, limit, offset)
      .all();
    return results;
  }

  async markNotificationAsRead(notificationId) {
    return this.db
      .prepare("UPDATE notifications SET is_read = 1 WHERE id = ?")
      .bind(notificationId)
      .run();
  }

  // ==================== CONVERSATIONS ====================
  async createConversation(id, type, name, image, createdBy) {
    return this.db
      .prepare(
        `INSERT INTO conversations (id, type, name, image, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, type, name, image, createdBy, new Date().toISOString(), new Date().toISOString())
      .run();
  }

  async getConversation(conversationId) {
    return this.db
      .prepare("SELECT * FROM conversations WHERE id = ?")
      .bind(conversationId)
      .first();
  }

  async getUserConversations(userId) {
    const { results } = await this.db
      .prepare(
        `SELECT DISTINCT c.* FROM conversations c
         INNER JOIN conversation_members cm ON c.id = cm.conversation_id
         WHERE cm.user_id = ? AND cm.left_at IS NULL
         ORDER BY c.updated_at DESC`
      )
      .bind(userId)
      .all();
    return results;
  }

  async deleteConversation(conversationId) {
    return this.db
      .prepare("DELETE FROM conversations WHERE id = ?")
      .bind(conversationId)
      .run();
  }

  // ==================== MESSAGES ====================
  async sendMessage(id, conversationId, senderId, type, content, mediaUrl = null, thumbnailUrl = null) {
    return this.db
      .prepare(
        `INSERT INTO messages (id, conversation_id, sender_id, type, content, media_url, thumbnail_url, is_deleted, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
      )
      .bind(
        id,
        conversationId,
        senderId,
        type,
        content,
        mediaUrl,
        thumbnailUrl,
        new Date().toISOString(),
        new Date().toISOString()
      )
      .run();
  }

  async getConversationMessages(conversationId, limit = 50, offset = 0) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM messages WHERE conversation_id = ? AND is_deleted = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(conversationId, limit, offset)
      .all();
    return results;
  }

  async getMessage(messageId) {
    return this.db
      .prepare("SELECT * FROM messages WHERE id = ? AND is_deleted = 0")
      .bind(messageId)
      .first();
  }

  async updateMessage(messageId, content) {
    return this.db
      .prepare("UPDATE messages SET content = ?, updated_at = ? WHERE id = ?")
      .bind(content, new Date().toISOString(), messageId)
      .run();
  }

  async deleteMessage(messageId) {
    return this.db
      .prepare("UPDATE messages SET is_deleted = 1, updated_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), messageId)
      .run();
  }

  async addConversationMember(id, conversationId, userId, role = "member") {
    return this.db
      .prepare(
        `INSERT INTO conversation_members (id, conversation_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id, conversationId, userId, role, new Date().toISOString())
      .run();
  }

  async removeConversationMember(conversationId, userId) {
    return this.db
      .prepare("UPDATE conversation_members SET left_at = ? WHERE conversation_id = ? AND user_id = ?")
      .bind(new Date().toISOString(), conversationId, userId)
      .run();
  }

  async getConversationMembers(conversationId) {
    const { results } = await this.db
      .prepare("SELECT * FROM conversation_members WHERE conversation_id = ? AND left_at IS NULL")
      .bind(conversationId)
      .all();
    return results;
  }

  async markMessageAsRead(id, messageId, userId) {
    return this.db
      .prepare(
        `INSERT OR REPLACE INTO message_reads (id, message_id, user_id, status, seen_at)
         VALUES (?, ?, ?, 'seen', ?)`
      )
      .bind(id, messageId, userId, new Date().toISOString())
      .run();
  }

  // ==================== CALLS ====================
  async startCall(id, conversationId, callerId, callType, roomId, sessionId) {
    return this.db
      .prepare(
        `INSERT INTO calls (id, conversation_id, caller_id, call_type, call_status, started_at, room_id, session_id, created_at)
         VALUES (?, ?, ?, ?, 'ringing', ?, ?, ?, ?)`
      )
      .bind(
        id,
        conversationId || null,
        callerId,
        callType,
        new Date().toISOString(),
        roomId,
        sessionId,
        new Date().toISOString()
      )
      .run();
  }

  async getCall(callId) {
    return this.db
      .prepare("SELECT * FROM calls WHERE id = ?")
      .bind(callId)
      .first();
  }

  async updateCallStatus(callId, status, answeredAt = null, endedAt = null) {
    let query = "UPDATE calls SET call_status = ?";
    const params = [status];

    if (answeredAt) {
      query += ", answered_at = ?";
      params.push(answeredAt);
    }
    if (endedAt) {
      query += ", ended_at = ?";
      params.push(endedAt);
      
      // Calculate duration
      query += ", duration = CAST((strftime('%s', ?) - strftime('%s', started_at)) AS INTEGER)";
      params.push(endedAt);
    }

    query += " WHERE id = ?";
    params.push(callId);

    return this.db.prepare(query).bind(...params).run();
  }

  async addCallParticipant(id, callId, userId, role = "participant") {
    return this.db
      .prepare(
        `INSERT INTO call_participants (id, call_id, user_id, join_time, role, status)
         VALUES (?, ?, ?, ?, ?, 'active')`
      )
      .bind(id, callId, userId, new Date().toISOString(), role)
      .run();
  }

  async getCallParticipants(callId) {
    const { results } = await this.db
      .prepare("SELECT * FROM call_participants WHERE call_id = ? AND status = 'active'")
      .bind(callId)
      .all();
    return results;
  }

  async removeCallParticipant(callId, userId) {
    return this.db
      .prepare(
        `UPDATE call_participants SET status = 'inactive', leave_time = ? WHERE call_id = ? AND user_id = ?`
      )
      .bind(new Date().toISOString(), callId, userId)
      .run();
  }

  // ==================== LIKES TABLE (UNIVERSAL) ====================
  async addLike(id, userId, entityType, entityId) {
    return this.db
      .prepare(
        `INSERT INTO likes (id, user_id, entity_type, entity_id, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id, userId, entityType, entityId, new Date().toISOString())
      .run();
  }

  async removeLike(userId, entityType, entityId) {
    return this.db
      .prepare(
        `DELETE FROM likes WHERE user_id = ? AND entity_type = ? AND entity_id = ?`
      )
      .bind(userId, entityType, entityId)
      .run();
  }

  async getLike(userId, entityType, entityId) {
    return this.db
      .prepare(
        `SELECT * FROM likes WHERE user_id = ? AND entity_type = ? AND entity_id = ?`
      )
      .bind(userId, entityType, entityId)
      .first();
  }

  async getLikes(entityType, entityId, limit = 50, offset = 0) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM likes WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(entityType, entityId, limit, offset)
      .all();
    return results;
  }

  async getLikeCount(entityType, entityId) {
    const result = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM likes WHERE entity_type = ? AND entity_id = ?`
      )
      .bind(entityType, entityId)
      .first();
    return result?.count || 0;
  }

  // ==================== COMMENTS TABLE (UNIVERSAL) ====================
  async addComment(id, userId, entityType, entityId, content, parentId = null) {
    return this.db
      .prepare(
        `INSERT INTO comments (id, user_id, entity_type, entity_id, content, parent_id, like_count, is_deleted, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`
      )
      .bind(id, userId, entityType, entityId, content, parentId, new Date().toISOString(), new Date().toISOString())
      .run();
  }

  async getComment(commentId) {
    return this.db
      .prepare(
        `SELECT * FROM comments WHERE id = ? AND is_deleted = 0`
      )
      .bind(commentId)
      .first();
  }

  async getComments(entityType, entityId, limit = 50, offset = 0) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM comments WHERE entity_type = ? AND entity_id = ? AND parent_id IS NULL AND is_deleted = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(entityType, entityId, limit, offset)
      .all();
    return results;
  }

  async getCommentReplies(parentId, limit = 20, offset = 0) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM comments WHERE parent_id = ? AND is_deleted = 0 ORDER BY created_at ASC LIMIT ? OFFSET ?`
      )
      .bind(parentId, limit, offset)
      .all();
    return results;
  }

  async updateComment(commentId, content) {
    return this.db
      .prepare(
        `UPDATE comments SET content = ?, updated_at = ? WHERE id = ? AND is_deleted = 0`
      )
      .bind(content, new Date().toISOString(), commentId)
      .run();
  }

  async deleteComment(commentId) {
    return this.db
      .prepare(
        `UPDATE comments SET is_deleted = 1, updated_at = ? WHERE id = ?`
      )
      .bind(new Date().toISOString(), commentId)
      .run();
  }

  async incrementCommentLikes(commentId) {
    return this.db
      .prepare(
        `UPDATE comments SET like_count = like_count + 1 WHERE id = ? AND is_deleted = 0`
      )
      .bind(commentId)
      .run();
  }

  async decrementCommentLikes(commentId) {
    return this.db
      .prepare(
        `UPDATE comments SET like_count = CASE WHEN like_count > 0 THEN like_count - 1 ELSE 0 END WHERE id = ? AND is_deleted = 0`
      )
      .bind(commentId)
      .run();
  }

  async getCommentCount(entityType, entityId) {
    const result = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM comments WHERE entity_type = ? AND entity_id = ? AND is_deleted = 0`
      )
      .bind(entityType, entityId)
      .first();
    return result?.count || 0;
  }

  // ==================== SHARES TABLE (UNIVERSAL) ====================
  async addShare(id, userId, entityType, entityId, shareType = null, targetUserId = null) {
    return this.db
      .prepare(
        `INSERT INTO shares (id, user_id, entity_type, entity_id, share_type, target_user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, userId, entityType, entityId, shareType, targetUserId, new Date().toISOString())
      .run();
  }

  async getShares(entityType, entityId, limit = 50, offset = 0) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM shares WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(entityType, entityId, limit, offset)
      .all();
    return results;
  }

  async getShareCount(entityType, entityId) {
    const result = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM shares WHERE entity_type = ? AND entity_id = ?`
      )
      .bind(entityType, entityId)
      .first();
    return result?.count || 0;
  }

  async getUserShares(userId, limit = 50, offset = 0) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM shares WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(userId, limit, offset)
      .all();
    return results;
  }

  async getSharesByTargetUser(targetUserId, limit = 50, offset = 0) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM shares WHERE target_user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(targetUserId, limit, offset)
      .all();
    return results;
  }

  // ==================== REPORTS TABLE (MODERATION) ====================
  async addReport(id, reporterId, entityType, entityId, reasonCode, description) {
    return this.db
      .prepare(
        `INSERT INTO reports (id, reporter_id, entity_type, entity_id, reason_code, description, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
      )
      .bind(id, reporterId, entityType, entityId, reasonCode, description, new Date().toISOString())
      .run();
  }

  async getReport(reportId) {
    return this.db
      .prepare("SELECT * FROM reports WHERE id = ?")
      .bind(reportId)
      .first();
  }

  async getReports(entityType, entityId, limit = 50, offset = 0) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM reports WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(entityType, entityId, limit, offset)
      .all();
    return results;
  }

  async updateReportStatus(reportId, status) {
    return this.db
      .prepare("UPDATE reports SET status = ? WHERE id = ?")
      .bind(status, reportId)
      .run();
  }

  async getPendingReports(limit = 50, offset = 0) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM reports WHERE status = 'pending' ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(limit, offset)
      .all();
    return results;
  }

  // ==================== BLOCKS TABLE (USER BLOCKING) ====================
  async blockUser(id, blockerId, blockedId) {
    return this.db
      .prepare(
        `INSERT INTO blocks (id, blocker_id, blocked_id, created_at) VALUES (?, ?, ?, ?)`
      )
      .bind(id, blockerId, blockedId, new Date().toISOString())
      .run();
  }

  async unblockUser(blockerId, blockedId) {
    return this.db
      .prepare(
        `DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?`
      )
      .bind(blockerId, blockedId)
      .run();
  }

  async isBlocked(blockerId, blockedId) {
    const result = await this.db
      .prepare(
        `SELECT id FROM blocks WHERE blocker_id = ? AND blocked_id = ?`
      )
      .bind(blockerId, blockedId)
      .first();
    return !!result;
  }

  async getBlockedUsers(blockerId, limit = 50, offset = 0) {
    const { results } = await this.db
      .prepare(
        `SELECT blocked_id FROM blocks WHERE blocker_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(blockerId, limit, offset)
      .all();
    return results;
  }

  async getBlockedByUsers(blockedId, limit = 50, offset = 0) {
    const { results } = await this.db
      .prepare(
        `SELECT blocker_id FROM blocks WHERE blocked_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(blockedId, limit, offset)
      .all();
    return results;
  }

  // ==================== USER STATS ====================
  async updateUserStats(userId, statsObject) {
    const columns = [];
    const values = [];
    const placeholders = [];

    for (const [key, value] of Object.entries(statsObject)) {
      columns.push(key);
      values.push(value);
      placeholders.push("?");
    }

    columns.push("updated_at");
    values.push(new Date().toISOString());
    placeholders.push("?");

    const query = `INSERT INTO user_stats (user_id, ${columns.join(", ")}) VALUES (?, ${placeholders.join(", ")})
                   ON CONFLICT(user_id) DO UPDATE SET ${columns.map((col, i) => `${col} = excluded.${col}`).join(", ")}`;

    return this.db.prepare(query).bind(userId, ...values).run();
  }

  async getUserStats(userId) {
    return this.db
      .prepare("SELECT * FROM user_stats WHERE user_id = ?")
      .bind(userId)
      .first();
  }

  async incrementUserStat(userId, statField, increment = 1) {
    return this.db
      .prepare(
        `UPDATE user_stats SET ${statField} = COALESCE(${statField}, 0) + ?, updated_at = ? WHERE user_id = ?`
      )
      .bind(increment, new Date().toISOString(), userId)
      .run();
  }

  // ==================== POST STATS ====================
  async updatePostStats(postId, statsObject) {
    const columns = ["post_id"];
    const values = [postId];

    for (const [key, value] of Object.entries(statsObject)) {
      columns.push(key);
      values.push(value);
    }

    columns.push("updated_at");
    values.push(new Date().toISOString());

    const placeholders = columns.map(() => "?").join(", ");
    const query = `INSERT INTO post_stats (${columns.join(", ")}) VALUES (${placeholders})
                   ON CONFLICT(post_id) DO UPDATE SET ${columns.slice(1).map(col => `${col} = excluded.${col}`).join(", ")}`;

    return this.db.prepare(query).bind(...values).run();
  }

  async getPostStats(postId) {
    return this.db
      .prepare("SELECT * FROM post_stats WHERE post_id = ?")
      .bind(postId)
      .first();
  }

  async incrementPostStat(postId, statField, increment = 1) {
    return this.db
      .prepare(
        `UPDATE post_stats SET ${statField} = COALESCE(${statField}, 0) + ?, updated_at = ? 
         WHERE post_id = ? OR post_id NOT IN (SELECT post_id FROM post_stats WHERE post_id = ?)`
      )
      .bind(increment, new Date().toISOString(), postId, postId)
      .run();
  }

  // ==================== STORY STATS ====================
  async updateStoryStats(storyId, statsObject) {
    const columns = ["story_id"];
    const values = [storyId];

    for (const [key, value] of Object.entries(statsObject)) {
      columns.push(key);
      values.push(value);
    }

    columns.push("updated_at");
    values.push(new Date().toISOString());

    const placeholders = columns.map(() => "?").join(", ");
    const query = `INSERT INTO story_stats (${columns.join(", ")}) VALUES (${placeholders})
                   ON CONFLICT(story_id) DO UPDATE SET ${columns.slice(1).map(col => `${col} = excluded.${col}`).join(", ")}`;

    return this.db.prepare(query).bind(...values).run();
  }

  async getStoryStats(storyId) {
    return this.db
      .prepare("SELECT * FROM story_stats WHERE story_id = ?")
      .bind(storyId)
      .first();
  }

  async incrementStoryStat(storyId, statField, increment = 1) {
    return this.db
      .prepare(
        `UPDATE story_stats SET ${statField} = COALESCE(${statField}, 0) + ?, updated_at = ? WHERE story_id = ?`
      )
      .bind(increment, new Date().toISOString(), storyId)
      .run();
  }

  // ==================== POLL STATS ====================
  async updatePollStats(pollId, statsObject) {
    const columns = ["poll_id"];
    const values = [pollId];

    for (const [key, value] of Object.entries(statsObject)) {
      columns.push(key);
      values.push(value);
    }

    columns.push("updated_at");
    values.push(new Date().toISOString());

    const placeholders = columns.map(() => "?").join(", ");
    const query = `INSERT INTO poll_stats (${columns.join(", ")}) VALUES (${placeholders})
                   ON CONFLICT(poll_id) DO UPDATE SET ${columns.slice(1).map(col => `${col} = excluded.${col}`).join(", ")}`;

    return this.db.prepare(query).bind(...values).run();
  }

  async getPollStats(pollId) {
    return this.db
      .prepare("SELECT * FROM poll_stats WHERE poll_id = ?")
      .bind(pollId)
      .first();
  }

  async incrementPollStat(pollId, statField, increment = 1) {
    return this.db
      .prepare(
        `UPDATE poll_stats SET ${statField} = COALESCE(${statField}, 0) + ?, updated_at = ? WHERE poll_id = ?`
      )
      .bind(increment, new Date().toISOString(), pollId)
      .run();
  }

  // ==================== EVENT STATS ====================
  async updateEventStats(eventId, statsObject) {
    const columns = ["event_id"];
    const values = [eventId];

    for (const [key, value] of Object.entries(statsObject)) {
      columns.push(key);
      values.push(value);
    }

    columns.push("updated_at");
    values.push(new Date().toISOString());

    const placeholders = columns.map(() => "?").join(", ");
    const query = `INSERT INTO event_stats (${columns.join(", ")}) VALUES (${placeholders})
                   ON CONFLICT(event_id) DO UPDATE SET ${columns.slice(1).map(col => `${col} = excluded.${col}`).join(", ")}`;

    return this.db.prepare(query).bind(...values).run();
  }

  async getEventStats(eventId) {
    return this.db
      .prepare("SELECT * FROM event_stats WHERE event_id = ?")
      .bind(eventId)
      .first();
  }

  async incrementEventStat(eventId, statField, increment = 1) {
    return this.db
      .prepare(
        `UPDATE event_stats SET ${statField} = COALESCE(${statField}, 0) + ?, updated_at = ? WHERE event_id = ?`
      )
      .bind(increment, new Date().toISOString(), eventId)
      .run();
  }

  // ==================== GROUP STATS ====================
  async updateGroupStats(groupId, statsObject) {
    const columns = ["group_id"];
    const values = [groupId];

    for (const [key, value] of Object.entries(statsObject)) {
      columns.push(key);
      values.push(value);
    }

    columns.push("updated_at");
    values.push(new Date().toISOString());

    const placeholders = columns.map(() => "?").join(", ");
    const query = `INSERT INTO group_stats (${columns.join(", ")}) VALUES (${placeholders})
                   ON CONFLICT(group_id) DO UPDATE SET ${columns.slice(1).map(col => `${col} = excluded.${col}`).join(", ")}`;

    return this.db.prepare(query).bind(...values).run();
  }

  async getGroupStats(groupId) {
    return this.db
      .prepare("SELECT * FROM group_stats WHERE group_id = ?")
      .bind(groupId)
      .first();
  }

  async incrementGroupStat(groupId, statField, increment = 1) {
    return this.db
      .prepare(
        `UPDATE group_stats SET ${statField} = COALESCE(${statField}, 0) + ?, updated_at = ? WHERE group_id = ?`
      )
      .bind(increment, new Date().toISOString(), groupId)
      .run();
  }

  // ==================== CONTENT STATS (UNIVERSAL) ====================
  async updateContentStats(entityType, entityId, statsObject) {
    const columns = ["entity_type", "entity_id"];
    const values = [entityType, entityId];

    for (const [key, value] of Object.entries(statsObject)) {
      columns.push(key);
      values.push(value);
    }

    columns.push("updated_at");
    values.push(new Date().toISOString());

    const placeholders = columns.map(() => "?").join(", ");
    const query = `INSERT INTO content_stats (id, ${columns.join(", ")}) VALUES (?, ${placeholders.slice(0, -2)}, ${placeholders.slice(-2)})
                   ON CONFLICT(entity_type, entity_id) DO UPDATE SET ${columns.slice(2).map(col => `${col} = excluded.${col}`).join(", ")}`;

    const contentStatsId = `${entityType}_${entityId}`;
    return this.db.prepare(query).bind(contentStatsId, ...values).run();
  }

  async getContentStats(entityType, entityId) {
    return this.db
      .prepare("SELECT * FROM content_stats WHERE entity_type = ? AND entity_id = ?")
      .bind(entityType, entityId)
      .first();
  }

  async incrementContentStat(entityType, entityId, statField, increment = 1) {
    return this.db
      .prepare(
        `UPDATE content_stats SET ${statField} = COALESCE(${statField}, 0) + ?, updated_at = ? 
         WHERE entity_type = ? AND entity_id = ?`
      )
      .bind(increment, new Date().toISOString(), entityType, entityId)
      .run();
  }

  // ==================== EARNINGS ====================
  async addEarning(id, userId, sourceType, sourceId, amount) {
    return this.db
      .prepare(
        `INSERT INTO earnings (id, user_id, source_type, source_id, amount, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(id, userId, sourceType, sourceId, amount, new Date().toISOString())
      .run();
  }

  async getUserEarnings(userId, limit = 50, offset = 0) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM earnings WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(userId, limit, offset)
      .all();
    return results;
  }

  async getTotalEarnings(userId) {
    const result = await this.db
      .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM earnings WHERE user_id = ?")
      .bind(userId)
      .first();
    return result?.total || 0;
  }

  async getEarningsBySource(userId, sourceType, limit = 50, offset = 0) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM earnings WHERE user_id = ? AND source_type = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(userId, sourceType, limit, offset)
      .all();
    return results;
  }

  // ==================== DAILY STATS ====================
  async addDailyStat(id, userId, date, statsObject) {
    const columns = ["id", "user_id", "date"];
    const values = [id, userId, date];

    for (const [key, value] of Object.entries(statsObject)) {
      columns.push(key);
      values.push(value);
    }

    columns.push("created_at");
    values.push(new Date().toISOString());

    const placeholders = columns.map(() => "?").join(", ");
    const query = `INSERT INTO daily_stats (${columns.join(", ")}) VALUES (${placeholders})
                   ON CONFLICT(user_id, date) DO UPDATE SET ${columns.slice(3).map(col => `${col} = excluded.${col}`).join(", ")}`;

    return this.db.prepare(query).bind(...values).run();
  }

  async getDailyStat(userId, date) {
    return this.db
      .prepare("SELECT * FROM daily_stats WHERE user_id = ? AND date = ?")
      .bind(userId, date)
      .first();
  }

  async getUserDailyStats(userId, limit = 30, offset = 0) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM daily_stats WHERE user_id = ? ORDER BY date DESC LIMIT ? OFFSET ?`
      )
      .bind(userId, limit, offset)
      .all();
    return results;
  }

  async getDailyStatsByDateRange(userId, startDate, endDate) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM daily_stats WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC`
      )
      .bind(userId, startDate, endDate)
      .all();
    return results;
  }

  // ==================== UTILITY ====================
  async getDatabase() {
    return this.db;
  }
}

export default Database;
