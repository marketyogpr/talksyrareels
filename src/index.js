/**
 * TalkSyra Cloudflare Worker
 * 
 * Handles three primary responsibilities:
 * 1. Media Upload Bridge (R2) - Secure file uploads without exposing credentials
 * 2. Real-time Signaling (WebSocket) - Persistent connections for chat & WebRTC
 * 3. Feed Algorithm API - Personalized feed and engagement tracking
 */

import FeedAPIService from './feedAPIService.js';
import { createClient } from '@supabase/supabase-js';

// In-memory store for active WebSocket connections
const USER_SESSIONS = new Map();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      // --- 1. HANDLE FEED API ---
      if (url.pathname.startsWith("/api/")) {
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
        const feedAPI = new FeedAPIService(supabase);
        return await feedAPI.handleRequest(request);
      }

      // --- 2. HANDLE MEDIA UPLOAD (R2) ---
      if (url.pathname === "/upload" && request.method === "POST") {
        return await handleMediaUpload(request, env);
      }

      // --- 3. HANDLE WEBSOCKET (SIGNALING) ---
      if (url.pathname === "/ws" && request.method === "GET") {
        return await handleWebSocket(request, env, ctx);
      }

      // --- 4. HEALTH CHECK ---
      if (url.pathname === "/health") {
        return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Default response with API documentation
      return new Response(
        JSON.stringify({
          message: "TalkSyra Worker Running",
          version: "2.0",
          features: [
            "Media Upload (R2)",
            "Real-time Communication (WebSocket)",
            "Feed Algorithm API (Instagram-like)"
          ],
          endpoints: {
            feed: [
              "/api/feed/home",
              "/api/feed/explore",
              "/api/feed/reels",
              "/api/feed/trending",
              "/api/feed/saved"
            ],
            engagement: [
              "/api/engagement/like",
              "/api/engagement/comment",
              "/api/engagement/share",
              "/api/engagement/save",
              "/api/engagement/view",
              "/api/engagement/watch",
              "/api/engagement/report",
              "/api/engagement/block"
            ],
            stats: [
              "/api/stats/user-engagement",
              "/api/stats/post",
              "/api/stats/trending"
            ],
            interests: [
              "/api/interests/get",
              "/api/interests/update",
              "/api/interests/suggestions"
            ],
            recommendations: [
              "/api/recommendations/discover",
              "/api/recommendations/similar"
            ]
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Worker Error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
};

/**
 * Handle Media Uploads to R2
 * Supports folder-based structure: video/, post/, profile/, word/
 */
async function handleMediaUpload(request, env) {
  try {
    // Validate R2 bucket exists
    if (!env.MY_R2_BUCKET) {
      return new Response(
        JSON.stringify({ error: "R2 Bucket not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const fileType = formData.get("type") || "other"; // video, post, profile, word

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    const validTypes = ["video", "post", "profile", "word"];
    const folder = validTypes.includes(fileType) ? fileType : "other";

    // Validate file size (max 500MB)
    const buffer = await file.arrayBuffer();
    const fileSizeInMB = buffer.byteLength / (1024 * 1024);
    if (fileSizeInMB > 500) {
      return new Response(
        JSON.stringify({ error: "File size exceeds 500MB limit" }),
        { status: 413, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate unique filename with timestamp and UUID
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const fileExtension = file.name.split(".").pop();
    const uniqueFileName = `${timestamp}-${randomSuffix}.${fileExtension}`;
    
    // Create folder structure: video/timestamp-random.ext, post/timestamp-random.ext, etc.
    const filePath = `${folder}/${uniqueFileName}`;

    // Upload to R2 Bucket with folder structure
    await env.MY_R2_BUCKET.put(filePath, buffer, {
      httpMetadata: {
        contentType: file.type || "application/octet-stream"
      },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        originalName: file.name,
        fileType: folder
      }
    });

    // Construct public URL
    const publicUrl = `${env.R2_PUBLIC_DOMAIN}/${filePath}`;

    console.log(`File uploaded: ${filePath}`);

    return new Response(
      JSON.stringify({
        success: true,
        fileName: uniqueFileName,
        filePath: filePath,
        folder: folder,
        url: publicUrl,
        size: buffer.byteLength,
        timestamp
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Upload Error:", error);
    return new Response(
      JSON.stringify({ error: "File upload failed", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handle WebSocket Connections for Real-time Signaling
 */
async function handleWebSocket(request, env, ctx) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId parameter" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate WebSocket upgrade header
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response(
        JSON.stringify({ error: "Expected WebSocket upgrade" }),
        { status: 426, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create WebSocket pair
    const [client, server] = new WebSocketPair();

    // Handle the session
    ctx.waitUntil(handleSession(server, userId, env));

    return new Response(null, { status: 101, webSocket: client });
  } catch (error) {
    console.error("WebSocket Error:", error);
    return new Response(
      JSON.stringify({ error: "WebSocket connection failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handle WebSocket Session
 */
async function handleSession(socket, userId, env) {
  socket.accept();

  // Register user session
  USER_SESSIONS.set(userId, socket);
  console.log(`User connected: ${userId} (Total: ${USER_SESSIONS.size})`);

  // Notify all users about this user coming online
  broadcastUserStatus("online", userId);

  socket.addEventListener("message", async (event) => {
    try {
      const data = JSON.parse(event.data);
      await routeMessage(data, userId, env);
    } catch (error) {
      console.error("Message Processing Error:", error);
      sendErrorToUser(socket, "Message processing failed");
    }
  });

  socket.addEventListener("close", () => {
    USER_SESSIONS.delete(userId);
    console.log(`User disconnected: ${userId} (Total: ${USER_SESSIONS.size})`);
    broadcastUserStatus("offline", userId);
  });

  socket.addEventListener("error", (event) => {
    console.error(`WebSocket Error for ${userId}:`, event);
    USER_SESSIONS.delete(userId);
    broadcastUserStatus("offline", userId);
  });
}

/**
 * Route incoming messages to appropriate handlers
 */
async function routeMessage(data, senderId, env) {
  const { type, targetId, message, payload } = data;

  if (!type) {
    console.warn("Message missing 'type' field");
    return;
  }

  switch (type) {
    case "message":
      // Chat message routing
      sendMessageToUser(targetId, {
        type: "message",
        from: senderId,
        message,
        timestamp: new Date().toISOString()
      });
      break;

    case "typing":
      // Typing indicator
      sendMessageToUser(targetId, {
        type: "typing",
        from: senderId
      });
      break;

    case "offer":
    case "answer":
      // WebRTC signaling
      sendMessageToUser(targetId, {
        type,
        from: senderId,
        payload
      });
      break;

    case "candidate":
      // ICE candidate
      sendMessageToUser(targetId, {
        type: "candidate",
        from: senderId,
        candidate: payload
      });
      break;

    case "call-request":
      // Incoming call notification
      sendMessageToUser(targetId, {
        type: "call-request",
        from: senderId,
        callType: payload?.callType || "voice"
      });
      break;

    case "call-decline":
      // Call declined
      sendMessageToUser(targetId, {
        type: "call-decline",
        from: senderId
      });
      break;

    case "call-end":
      // Call ended
      sendMessageToUser(targetId, {
        type: "call-end",
        from: senderId
      });
      break;

    case "get-users":
      // Get list of online users
      const onlineUsers = Array.from(USER_SESSIONS.keys());
      const senderSocket = USER_SESSIONS.get(senderId);
      if (senderSocket && senderSocket.readyState === 1) { // OPEN state
        senderSocket.send(JSON.stringify({
          type: "users-list",
          users: onlineUsers.filter(u => u !== senderId)
        }));
      }
      break;

    default:
      console.warn(`Unknown message type: ${type}`);
  }
}

/**
 * Send a message to a specific user
 */
function sendMessageToUser(targetId, message) {
  if (!targetId) return;

  const targetSocket = USER_SESSIONS.get(targetId);
  if (targetSocket && targetSocket.readyState === 1) { // WebSocket OPEN state
    try {
      targetSocket.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Failed to send message to ${targetId}:`, error);
    }
  } else {
    console.warn(`User ${targetId} not connected or socket not ready`);
  }
}

/**
 * Broadcast user status to all connected users
 */
function broadcastUserStatus(status, userId) {
  const message = {
    type: "user-status",
    userId,
    status, // "online" or "offline"
    timestamp: new Date().toISOString()
  };

  USER_SESSIONS.forEach((socket, id) => {
    if (socket.readyState === 1) { // WebSocket OPEN state
      try {
        socket.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to broadcast to ${id}:`, error);
      }
    }
  });
}

/**
 * Send error message to user
 */
function sendErrorToUser(socket, errorMessage) {
  if (socket && socket.readyState === 1) {
    try {
      socket.send(JSON.stringify({
        type: "error",
        message: errorMessage,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error("Failed to send error message:", error);
    }
  }
}
