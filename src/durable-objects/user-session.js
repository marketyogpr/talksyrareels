/**
 * DURABLE OBJECTS - User Session Manager
 * Har user ke liye ek DO instance jo uska WebSocket connection aur signals manage karta hai
 * Real-time messaging aur P2P signaling ke liye
 */

export class UserSession {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map(); // userId -> WebSocket connection
    this.callSessions = new Map(); // callId -> participants info
  }

  /**
   * ===== HANDLE CONNECTION =====
   * Worker se WebSocket connection ane par ye call hota hai
   */
  async handleConnection(webSocket, userId) {
    // Durable Object mein hum persistent state maintain kar sakte hain
    await this.state.blockConcurrencyWhile(async () => {
      // User ko sessions mein add karo
      if (!this.sessions.has(userId)) {
        this.sessions.set(userId, []);
      }
      
      const connections = this.sessions.get(userId);
      connections.push(webSocket);

      console.log(`User ${userId} connected. Total connections: ${connections.length}`);
    });

    // WebSocket events handle karo
    webSocket.addEventListener("message", async (event) => {
      try {
        const data = JSON.parse(event.data);
        await this.handleMessage(data, userId, webSocket);
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    });

    webSocket.addEventListener("close", async () => {
      // Connection close hone par remove karo
      await this.state.blockConcurrencyWhile(async () => {
        const connections = this.sessions.get(userId);
        if (connections) {
          const idx = connections.indexOf(webSocket);
          if (idx !== -1) connections.splice(idx, 1);
          if (connections.length === 0) this.sessions.delete(userId);
        }
        console.log(`User ${userId} disconnected`);
      });
    });

    webSocket.addEventListener("error", (err) => {
      console.error("WebSocket error for user", userId, err);
    });
  }

  /**
   * ===== MESSAGE HANDLER =====
   * APK se aane wale sab messages ko handle karta hai
   */
  async handleMessage(data, senderId, webSocket) {
    const { type, targetId, conversationId, message, callType, offer, answer, candidate } = data;

    // ===== CHAT MESSAGE =====
    if (type === "message") {
      await this.handleChatMessage(conversationId, senderId, targetId, message);
    }

    // ===== CALL SIGNALING =====
    // Offer: User A call initiate karta hai
    if (type === "offer") {
      await this.handleCallSignal(type, senderId, targetId, offer, callType);
    }

    // Answer: User B call accept karta hai
    if (type === "answer") {
      await this.handleCallSignal(type, senderId, targetId, answer, null);
    }

    // ICE Candidate: Network path share karna
    if (type === "candidate") {
      await this.handleCallSignal(type, senderId, targetId, candidate, null);
    }
  }

  /**
   * ===== CHAT MESSAGE HANDLER =====
   * 1. D1 mein save karo
   * 2. Target user ko route karo (online/offline)
   */
  async handleChatMessage(conversationId, senderId, targetId, messageData) {
    // Step 1: D1 Database mein save karo
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      await this.env.DB.prepare(
        `INSERT INTO messages (id, conversation_id, sender_id, type, content, media_url, thumbnail_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          messageId,
          conversationId,
          senderId,
          messageData.type || "text",
          messageData.content || "",
          messageData.mediaUrl || null,
          messageData.thumbnailUrl || null,
          new Date().toISOString(),
          new Date().toISOString()
        )
        .run();

      // Update conversation's last message
      await this.env.DB.prepare(
        `UPDATE conversations 
         SET last_message_id = ?, last_message_text = ?, last_message_time = ?, updated_at = ?
         WHERE id = ?`
      )
        .bind(
          messageId,
          messageData.content || "",
          new Date().toISOString(),
          new Date().toISOString(),
          conversationId
        )
        .run();
    } catch (dbErr) {
      console.error("Database error:", dbErr);
      return;
    }

    // Step 2: Target user ko route karo
    const payload = {
      type: "message",
      conversationId,
      senderId,
      messageId,
      ...messageData,
    };

    // Check if target is online
    const targetConnections = this.sessions.get(targetId);
    
    if (targetConnections && targetConnections.length > 0) {
      // Online: Direct send
      for (const conn of targetConnections) {
        if (conn.readyState === WebSocket.OPEN) {
          conn.send(JSON.stringify(payload));
        }
      }
    } else {
      // Offline: Send FCM notification (optional)
      await this.sendFCMNotification(targetId, senderId, messageData.content);
    }

    // Send acknowledgment to sender
    // (This would be sent through their WebSocket connection)
  }

  /**
   * ===== CALL SIGNALING HANDLER =====
   * WebRTC signals ko relay karta hai (memory mein, DB mein nahi)
   * Low latency ke liye direct forward karta hai
   */
  async handleCallSignal(signalType, senderId, targetId, signalData, callType) {
    const payload = {
      type: signalType, // "offer", "answer", "candidate"
      senderId,
      targetId,
      callType,
      [signalType]: signalData, // offer, answer, or candidate
    };

    // Target user ke sab connections ko signal bhejo
    const targetConnections = this.sessions.get(targetId);
    
    if (targetConnections && targetConnections.length > 0) {
      for (const conn of targetConnections) {
        if (conn.readyState === WebSocket.OPEN) {
          conn.send(JSON.stringify(payload));
        }
      }
    } else {
      // Target offline: Send missed call notification
      console.log(`User ${targetId} is offline, missed call notification sent`);
      await this.sendFCMNotification(targetId, senderId, `Missed ${callType || 'audio'} call`);
    }
  }

  /**
   * ===== FCM NOTIFICATION (Optional) =====
   * Offline users ko push notification send karna
   */
  async sendFCMNotification(userId, senderId, message) {
    try {
      // Firebase Cloud Messaging call (agar FCM setup hai to)
      // Ye optional hai - APK apna FCM key use kar sakta hai
      console.log(`FCM notification to ${userId} from ${senderId}: ${message}`);
      
      // Implement FCM call here if needed
      // await fetch('https://fcm.googleapis.com/fcm/send', {...})
    } catch (err) {
      console.error("FCM error:", err);
    }
  }

  /**
   * ===== BROADCAST MESSAGE =====
   * Group conversation ke liye sab members ko send karna
   */
  async broadcastToConversation(conversationId, messageData, excludeUserId = null) {
    // Get all members of conversation
    const { results: members } = await this.env.DB.prepare(
      `SELECT user_id FROM conversation_members WHERE conversation_id = ? AND left_at IS NULL`
    )
      .bind(conversationId)
      .all();

    // Send to all online members
    for (const member of members) {
      if (excludeUserId && member.user_id === excludeUserId) continue;

      const connections = this.sessions.get(member.user_id);
      if (connections && connections.length > 0) {
        for (const conn of connections) {
          if (conn.readyState === WebSocket.OPEN) {
            conn.send(JSON.stringify(messageData));
          }
        }
      }
    }
  }

  /**
   * ===== USER STATUS =====
   * Check if user is online
   */
  isUserOnline(userId) {
    const connections = this.sessions.get(userId);
    return connections && connections.length > 0;
  }

  /**
   * ===== GET ACTIVE SESSIONS =====
   * Debugging ke liye active sessions dekho
   */
  getActiveSessions() {
    return {
      totalUsers: this.sessions.size,
      users: Array.from(this.sessions.keys()),
      totalConnections: Array.from(this.sessions.values()).reduce((sum, arr) => sum + arr.length, 0),
    };
  }
}

export default UserSession;
