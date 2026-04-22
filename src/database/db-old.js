/**
 * DATABASE MODULE - D1 Connection Helper
 * Ye file D1 database ko manage karta hai
 * Messaging, Calls, Conversations - sab kuch yahi se handle hota hai
 */

export class Database {
  constructor(env) {
    this.db = env.DB;
  }

  // ===== CONVERSATIONS =====
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

  async updateConversation(conversationId, updates) {
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(", ");
    const values = [...Object.values(updates), conversationId];
    
    return this.db
      .prepare(`UPDATE conversations SET ${fields}, updated_at = ? WHERE id = ?`)
      .bind(...values, new Date().toISOString())
      .run();
  }

  async deleteConversation(conversationId) {
    return this.db
      .prepare("DELETE FROM conversations WHERE id = ?")
      .bind(conversationId)
      .run();
  }

  // ===== MESSAGES =====
  async sendMessage(id, conversationId, senderId, type, content, mediaUrl, thumbnailUrl, parentId) {
    return this.db
      .prepare(
        `INSERT INTO messages (id, conversation_id, sender_id, type, content, media_url, thumbnail_url, parent_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        conversationId,
        senderId,
        type,
        content,
        mediaUrl || null,
        thumbnailUrl || null,
        parentId || null,
        new Date().toISOString(),
        new Date().toISOString()
      )
      .run();
  }

  async getConversationMessages(conversationId, limit = 50, offset = 0) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM messages 
         WHERE conversation_id = ? AND is_deleted = 0
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
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

  // ===== CONVERSATION MEMBERS =====
  async addMember(id, conversationId, userId, role = "member") {
    return this.db
      .prepare(
        `INSERT INTO conversation_members (id, conversation_id, user_id, role, joined_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id, conversationId, userId, role, new Date().toISOString())
      .run();
  }

  async removeMember(conversationId, userId) {
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

  // ===== MESSAGE READS =====
  async markMessageAsRead(id, messageId, userId) {
    return this.db
      .prepare(
        `INSERT OR REPLACE INTO message_reads (id, message_id, user_id, status, seen_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id, messageId, userId, "seen", new Date().toISOString())
      .run();
  }

  async getMessageReadStatus(messageId) {
    const { results } = await this.db
      .prepare("SELECT * FROM message_reads WHERE message_id = ?")
      .bind(messageId)
      .all();
    return results;
  }

  // ===== CALLS =====
  async startCall(id, conversationId, callerId, callType, roomId, sessionId) {
    return this.db
      .prepare(
        `INSERT INTO calls (id, conversation_id, caller_id, call_type, call_status, started_at, room_id, session_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        conversationId || null,
        callerId,
        callType,
        "ringing",
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

  async updateCallStatus(callId, status, answeredAt = null, endedAt = null, duration = null) {
    let query = "UPDATE calls SET call_status = ?";
    const params = [status];

    if (answeredAt) {
      query += ", answered_at = ?";
      params.push(answeredAt);
    }
    if (endedAt) {
      query += ", ended_at = ?";
      params.push(endedAt);
    }
    if (duration) {
      query += ", duration = ?";
      params.push(duration);
    }

    query += " WHERE id = ?";
    params.push(callId);

    return this.db.prepare(query).bind(...params).run();
  }

  // ===== CALL PARTICIPANTS =====
  async addCallParticipant(id, callId, userId, role = "participant") {
    return this.db
      .prepare(
        `INSERT INTO call_participants (id, call_id, user_id, join_time, role, status)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(id, callId, userId, new Date().toISOString(), role, "active")
      .run();
  }

  async removeCallParticipant(callId, userId) {
    return this.db
      .prepare("UPDATE call_participants SET leave_time = ?, status = ? WHERE call_id = ? AND user_id = ?")
      .bind(new Date().toISOString(), "inactive", callId, userId)
      .run();
  }

  async getCallParticipants(callId) {
    const { results } = await this.db
      .prepare("SELECT * FROM call_participants WHERE call_id = ?")
      .bind(callId)
      .all();
    return results;
  }
}

export default Database;
