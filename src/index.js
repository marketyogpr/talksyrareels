/**
 * PROJECT: SHORTSTALKSYRA (UPDATED STRUCTURE)
 * COMPONENT: Cloudflare Worker REST API
 * DATABASE: D1 | STORAGE: R2
 * 
 * UPDATED WITH NEW SCHEMA:
 * - Posts (simplified) + Reels (linked)
 * - Stories + Story Views + Story Replies
 * - Groups + Group Members
 * - Thoughts + Polls
 * - All endpoints updated to use new column names
 */

import Database from "./database/db.js";
import { UserSession } from "./durable-objects/user-session.js";

export { UserSession };

// Generate UUID v4 for unique IDs - guaranteed uniqueness across all tables
const generateId = () => crypto.randomUUID();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // ===================================================================
    // CORS HEADERS
    // ===================================================================
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const db = new Database(env);
    const publicUrl = env.R2_PUBLIC_URL || "https://buyviro.com";
    const defaultProfilePicUrl = `${publicUrl}/defaults/profile.png`;

    const ensurePublicUrl = (dbUrl) => {
      if (!dbUrl) return defaultProfilePicUrl;
      if (dbUrl.includes("cloudflarestorage.com")) {
        const path = dbUrl.split("/socialapkvideos/")[1];
        return path ? `${publicUrl}/${path}` : defaultProfilePicUrl;
      }
      return typeof dbUrl === "string" && dbUrl.startsWith("https://") ? dbUrl : defaultProfilePicUrl;
    };

    try {
      // ===================================================================
      // USER SYSTEM (Existing - Keep as is for backward compatibility)
      // ===================================================================

      // Register User
      if (url.pathname === "/api/user/register" && method === "POST") {
        const form = await request.formData();
        const userId = form.get("userId");
        const username = form.get("username")?.toLowerCase().replace(/\s+/g, "") || "";
        const fullName = form.get("fullName") || "";
        const birthDate = form.get("birthDate") || null;
        const password = form.get("password") || "";
        const email = form.get("email") || "";
        const profilePic = form.get("profilePic");

        let profilePicUrl = defaultProfilePicUrl;
        if (profilePic && profilePic.size > 0) {
          const fileName = `profiles/${userId}_${Date.now()}.jpg`;
          await env.BUCKET.put(fileName, profilePic.stream());
          profilePicUrl = `${publicUrl}/${fileName}`;
        }

        await env.DB.prepare(
          `INSERT INTO users (
             userId, username, fullName, birthDate, password, email,
             profilePicUrl, coverPicUrl, bio, location, website,
             followerCount, followingCount, postCount, coinBalance,
             isVerified, isPremiumVerified, isPrivate, isGhostMode, createdAt
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, ?)`
        )
          .bind(
            userId,
            username,
            fullName,
            birthDate,
            password,
            email,
            profilePicUrl,
            "",
            "",
            "",
            "",
            new Date().toISOString()
          )
          .run();

        return new Response(JSON.stringify({ success: true, message: "User Registered" }), { headers: corsHeaders });
      }

      // Login User
      if (url.pathname === "/api/user/login" && method === "POST") {
        const form = await request.formData();
        const username = form.get("username");
        const password = form.get("password");

        const user = await env.DB.prepare(
          "SELECT * FROM users WHERE username = ? OR email = ?"
        )
          .bind(username, username)
          .first();

        if (!user || user.password !== password) {
          return new Response(JSON.stringify({ error: "Invalid credentials" }), {
            status: 401,
            headers: corsHeaders,
          });
        }

        return new Response(JSON.stringify(user), { headers: corsHeaders });
      }

      // Check Profile
      if (url.pathname === "/api/user/check" && method === "GET") {
        const userId = url.searchParams.get("userId");
        const user = await env.DB.prepare("SELECT * FROM users WHERE userId = ?")
          .bind(userId)
          .first();

        return new Response(JSON.stringify(user || { error: "User not found" }), {
          headers: corsHeaders,
        });
      }

      // ===================================================================
      // POSTS ENDPOINTS (UPDATED SCHEMA)
      // ===================================================================

      // Create Post
      if (url.pathname === "/api/posts/create" && method === "POST") {
        const form = await request.formData();
        const userId = form.get("user_id");
        const type = form.get("type") || "post"; // post, reel, story
        const caption = form.get("caption") || "";
        const visibility = form.get("visibility") || "public";

        const postId = generateId();

        // Create post record
        await db.createPost(postId, userId, type, caption, visibility);

        // If there's a video/image, create reel record
        const videoFile = form.get("video");
        if (videoFile && videoFile.size > 0) {
          const videoFileName = `posts/${postId}_${Date.now()}.mp4`;
          await env.BUCKET.put(videoFileName, videoFile.stream());
          const videoUrl = `${publicUrl}/${videoFileName}`;

          // Create thumbnail
          const thumbnailFileName = `posts/${postId}_thumb.jpg`;
          const thumbnailUrl = `${publicUrl}/${thumbnailFileName}`;

          const reelId = generateId();
          const duration = parseFloat(form.get("duration") || 0);
          const width = parseInt(form.get("width") || 1080);
          const height = parseInt(form.get("height") || 1920);

          await db.createReel(reelId, postId, videoUrl, thumbnailUrl, duration, width, height);
        }

        return new Response(
          JSON.stringify({
            success: true,
            postId,
            message: "Post created successfully",
          }),
          { headers: corsHeaders }
        );
      }

      // Get Feed
      if (url.pathname === "/api/posts/feed" && method === "GET") {
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        const posts = await db.getFeedPosts(limit, offset);

        return new Response(JSON.stringify({ success: true, posts }), {
          headers: corsHeaders,
        });
      }

      // Get User Posts
      if (url.pathname.match(/^\/api\/posts\/user\/[\w-]+$/) && method === "GET") {
        const userId = url.pathname.split("/").pop();
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        const posts = await db.getUserPosts(userId, limit, offset);

        return new Response(JSON.stringify({ success: true, posts }), {
          headers: corsHeaders,
        });
      }

      // Get Post Detail
      if (url.pathname.match(/^\/api\/posts\/detail\/[\w-]+/) && method === "GET") {
        const postId = url.pathname.split("/").pop();
        const post = await db.getPost(postId);
        const reel = post ? await db.getReelByPost(postId) : null;

        return new Response(
          JSON.stringify({
            success: true,
            post: { ...post, reel },
          }),
          { headers: corsHeaders }
        );
      }

      // Update Post
      if (url.pathname === "/api/posts/update" && method === "POST") {
        const form = await request.formData();
        const postId = form.get("postId");
        const caption = form.get("caption");
        const visibility = form.get("visibility");

        await db.updatePost(postId, caption, visibility);

        return new Response(
          JSON.stringify({ success: true, message: "Post updated" }),
          { headers: corsHeaders }
        );
      }

      // Delete Post
      if (url.pathname === "/api/posts/delete" && method === "POST") {
        const form = await request.formData();
        const postId = form.get("postId");

        await db.deletePost(postId);

        return new Response(
          JSON.stringify({ success: true, message: "Post deleted" }),
          { headers: corsHeaders }
        );
      }

      // Track Post View
      if (url.pathname === "/api/posts/view" && method === "POST") {
        const form = await request.formData();
        const postId = form.get("postId");

        await db.incrementPostViews(postId);

        return new Response(JSON.stringify({ success: true }), {
          headers: corsHeaders,
        });
      }

      // ===================================================================
      // STORIES ENDPOINTS (NEW)
      // ===================================================================

      // Create Story
      if (url.pathname === "/api/stories/create" && method === "POST") {
        const form = await request.formData();
        const userId = form.get("user_id");
        const caption = form.get("caption") || "";
        const mediaFile = form.get("media");
        const mediaType = form.get("media_type") || "image";

        const storyId = generateId();
        let mediaUrl = "";
        let thumbnailUrl = "";
        let duration = 0;

        if (mediaFile && mediaFile.size > 0) {
          const ext = mediaType === "video" ? "mp4" : "jpg";
          const fileName = `stories/${userId}/${storyId}.${ext}`;
          await env.BUCKET.put(fileName, mediaFile.stream());
          mediaUrl = `${publicUrl}/${fileName}`;
          duration = parseFloat(form.get("duration") || 5);
        }

        // Stories expire after 24 hours
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        await db.createStory(storyId, userId, mediaUrl, mediaType, thumbnailUrl, duration, caption, expiresAt);

        return new Response(
          JSON.stringify({
            success: true,
            storyId,
            message: "Story created",
          }),
          { headers: corsHeaders }
        );
      }

      // Get User Stories
      if (url.pathname.match(/^\/api\/stories\/user\/[\w-]+$/) && method === "GET") {
        const userId = url.pathname.split("/").pop();
        const stories = await db.getUserStories(userId);

        return new Response(JSON.stringify({ success: true, stories }), {
          headers: corsHeaders,
        });
      }

      // Add Story View
      if (url.pathname === "/api/stories/view" && method === "POST") {
        const form = await request.formData();
        const storyId = form.get("story_id");
        const userId = form.get("user_id");

        const viewId = generateId();
        await db.addStoryView(viewId, storyId, userId);

        return new Response(JSON.stringify({ success: true }), {
          headers: corsHeaders,
        });
      }

      // Get Story Viewers
      if (url.pathname.match(/^\/api\/stories\/[\w-]+\/viewers$/) && method === "GET") {
        const storyId = url.pathname.split("/")[3];
        const viewers = await db.getStoryViewers(storyId);

        return new Response(JSON.stringify({ success: true, viewers }), {
          headers: corsHeaders,
        });
      }

      // ===================================================================
      // GROUPS ENDPOINTS (NEW)
      // ===================================================================

      // Create Group
      if (url.pathname === "/api/groups/create" && method === "POST") {
        const form = await request.formData();
        const name = form.get("name");
        const description = form.get("description") || "";
        const createdBy = form.get("created_by");
        const isPrivate = parseInt(form.get("is_private") || "0");

        const groupId = generateId();
        let imageUrl = "";

        const imageFile = form.get("image");
        if (imageFile && imageFile.size > 0) {
          const fileName = `groups/${groupId}_${Date.now()}.jpg`;
          await env.BUCKET.put(fileName, imageFile.stream());
          imageUrl = `${publicUrl}/${fileName}`;
        }

        await db.createGroup(groupId, name, description, imageUrl, createdBy, isPrivate);
        await db.addGroupMember(generateId(), groupId, createdBy, "admin");

        return new Response(
          JSON.stringify({
            success: true,
            groupId,
            message: "Group created",
          }),
          { headers: corsHeaders }
        );
      }

      // Add Group Member
      if (url.pathname === "/api/groups/members/add" && method === "POST") {
        const form = await request.formData();
        const groupId = form.get("group_id");
        const userId = form.get("user_id");

        const memberId = generateId();
        await db.addGroupMember(memberId, groupId, userId, "member");

        return new Response(JSON.stringify({ success: true }), {
          headers: corsHeaders,
        });
      }

      // Get Group Members
      if (url.pathname.match(/^\/api\/groups\/[\w-]+\/members$/) && method === "GET") {
        const groupId = url.pathname.split("/")[3];
        const members = await db.getGroupMembers(groupId);

        return new Response(JSON.stringify({ success: true, members }), {
          headers: corsHeaders,
        });
      }

      // ===================================================================
      // THOUGHTS ENDPOINTS (NEW - SHORT TEXT CONTENT)
      // ===================================================================

      // Create Thought
      if (url.pathname === "/api/thoughts/create" && method === "POST") {
        const form = await request.formData();
        const postId = form.get("post_id");
        const text = form.get("text");

        const thoughtId = generateId();
        await db.createThought(thoughtId, postId, text);

        return new Response(
          JSON.stringify({
            success: true,
            thoughtId,
            message: "Thought created",
          }),
          { headers: corsHeaders }
        );
      }

      // Get Post Thoughts
      if (url.pathname.match(/^\/api\/thoughts\/post\/[\w-]+$/) && method === "GET") {
        const postId = url.pathname.split("/").pop();
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        const thoughts = await db.getPostThoughts(postId, limit, offset);

        return new Response(JSON.stringify({ success: true, thoughts }), {
          headers: corsHeaders,
        });
      }

      // ===================================================================
      // POLLS ENDPOINTS (NEW)
      // ===================================================================

      // Create Poll
      if (url.pathname === "/api/polls/create" && method === "POST") {
        const form = await request.formData();
        const postId = form.get("post_id");
        const question = form.get("question");
        const expiresAt = form.get("expires_at") || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const isMultiple = parseInt(form.get("is_multiple") || "0");

        const pollId = generateId();
        await db.createPoll(pollId, postId, question, expiresAt, isMultiple);

        return new Response(
          JSON.stringify({
            success: true,
            pollId,
            message: "Poll created",
          }),
          { headers: corsHeaders }
        );
      }

      // Add Poll Option
      if (url.pathname === "/api/polls/options/add" && method === "POST") {
        const form = await request.formData();
        const pollId = form.get("poll_id");
        const optionText = form.get("option_text");

        const optionId = generateId();
        await db.createPollOption(optionId, pollId, optionText);

        return new Response(
          JSON.stringify({
            success: true,
            optionId,
            message: "Option added",
          }),
          { headers: corsHeaders }
        );
      }

      // Cast Poll Vote
      if (url.pathname === "/api/polls/vote" && method === "POST") {
        const form = await request.formData();
        const pollId = form.get("poll_id");
        const userId = form.get("user_id");
        const optionId = form.get("option_id");

        const voteId = generateId();
        await db.castPollVote(voteId, pollId, userId, optionId);

        return new Response(
          JSON.stringify({ success: true, message: "Vote cast" }),
          { headers: corsHeaders }
        );
      }

      // Get Poll
      if (url.pathname.match(/^\/api\/polls\/[\w-]+$/) && method === "GET") {
        const pollId = url.pathname.split("/").pop();
        const poll = await db.getPoll(pollId);
        const options = await db.getPollOptions(pollId);

        return new Response(
          JSON.stringify({
            success: true,
            poll: { ...poll, options },
          }),
          { headers: corsHeaders }
        );
      }

      // ===================================================================
      // NOTIFICATIONS ENDPOINTS
      // ===================================================================

      // Get User Notifications
      if (url.pathname === "/api/notifications" && method === "GET") {
        const userId = url.searchParams.get("user_id");
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        const notifications = await db.getUserNotifications(userId, limit, offset);

        return new Response(
          JSON.stringify({ success: true, notifications }),
          { headers: corsHeaders }
        );
      }

      // Mark Notification as Read
      if (url.pathname === "/api/notifications/read" && method === "POST") {
        const form = await request.formData();
        const notificationId = form.get("notification_id");

        await db.markNotificationAsRead(notificationId);

        return new Response(JSON.stringify({ success: true }), {
          headers: corsHeaders,
        });
      }

      // ===================================================================
      // MESSAGES & CONVERSATIONS (Existing endpoints preserved)
      // ===================================================================

      // Create Conversation
      if (url.pathname === "/api/conversations/create" && method === "POST") {
        const form = await request.formData();
        const type = form.get("type") || "private";
        const name = form.get("name");
        const image = form.get("image");
        const createdBy = form.get("created_by");

        const conversationId = generateId();
        await db.createConversation(conversationId, type, name, image, createdBy);

        return new Response(
          JSON.stringify({
            success: true,
            conversationId,
            message: "Conversation created",
          }),
          { headers: corsHeaders }
        );
      }

      // Send Message
      if (url.pathname === "/api/messages/send" && method === "POST") {
        const form = await request.formData();
        const conversationId = form.get("conversation_id");
        const senderId = form.get("sender_id");
        const type = form.get("type") || "text";
        const content = form.get("content");
        const mediaFile = form.get("media");

        const messageId = generateId();
        let mediaUrl = null;

        if (mediaFile && mediaFile.size > 0) {
          const fileName = `messages/${conversationId}/${messageId}_${Date.now()}`;
          await env.BUCKET.put(fileName, mediaFile.stream());
          mediaUrl = `${publicUrl}/${fileName}`;
        }

        await db.sendMessage(messageId, conversationId, senderId, type, content, mediaUrl);

        return new Response(
          JSON.stringify({
            success: true,
            messageId,
            message: "Message sent",
          }),
          { headers: corsHeaders }
        );
      }

      // Get Conversation Messages
      if (url.pathname.match(/^\/api\/messages\/[\w-]+$/) && method === "GET") {
        const conversationId = url.pathname.split("/").pop();
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        const messages = await db.getConversationMessages(conversationId, limit, offset);

        return new Response(
          JSON.stringify({ success: true, messages }),
          { headers: corsHeaders }
        );
      }

      // ===================================================================
      // CALLS (Preserved from existing)
      // ===================================================================

      // Start Call
      if (url.pathname === "/api/calls/start" && method === "POST") {
        const form = await request.formData();
        const conversationId = form.get("conversation_id");
        const callerId = form.get("caller_id");
        const callType = form.get("call_type") || "voice";
        const roomId = generateId();
        const sessionId = generateId();

        const callId = generateId();
        await db.startCall(callId, conversationId, callerId, callType, roomId, sessionId);

        return new Response(
          JSON.stringify({
            success: true,
            callId,
            roomId,
            sessionId,
            message: "Call started",
          }),
          { headers: corsHeaders }
        );
      }

      // ===================================================================
      // LIKES (Universal for Posts, Reels, Comments, etc.)
      // ===================================================================

      // Add Like
      if (url.pathname === "/api/likes/add" && method === "POST") {
        const form = await request.formData();
        const userId = form.get("user_id");
        const entityType = form.get("entity_type");
        const entityId = form.get("entity_id");

        const likeId = generateId();
        await db.addLike(likeId, userId, entityType, entityId);

        return new Response(
          JSON.stringify({
            success: true,
            likeId,
            message: "Like added",
          }),
          { headers: corsHeaders }
        );
      }

      // Remove Like
      if (url.pathname === "/api/likes/remove" && method === "POST") {
        const form = await request.formData();
        const userId = form.get("user_id");
        const entityType = form.get("entity_type");
        const entityId = form.get("entity_id");

        await db.removeLike(userId, entityType, entityId);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Like removed",
          }),
          { headers: corsHeaders }
        );
      }

      // Get Like Status
      if (url.pathname === "/api/likes/check" && method === "GET") {
        const userId = url.searchParams.get("user_id");
        const entityType = url.searchParams.get("entity_type");
        const entityId = url.searchParams.get("entity_id");

        const like = await db.getLike(userId, entityType, entityId);

        return new Response(
          JSON.stringify({
            liked: !!like,
            like: like || null,
          }),
          { headers: corsHeaders }
        );
      }

      // Get Likes for Entity
      if (url.pathname === "/api/likes/list" && method === "GET") {
        const entityType = url.searchParams.get("entity_type");
        const entityId = url.searchParams.get("entity_id");
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        const likes = await db.getLikes(entityType, entityId, limit, offset);
        const count = await db.getLikeCount(entityType, entityId);

        return new Response(
          JSON.stringify({
            likes,
            count,
          }),
          { headers: corsHeaders }
        );
      }

      // Get Like Count
      if (url.pathname === "/api/likes/count" && method === "GET") {
        const entityType = url.searchParams.get("entity_type");
        const entityId = url.searchParams.get("entity_id");

        const count = await db.getLikeCount(entityType, entityId);

        return new Response(
          JSON.stringify({
            count,
          }),
          { headers: corsHeaders }
        );
      }

      // ===================================================================
      // COMMENTS (Universal for Posts, Reels, Comments, etc.)
      // ===================================================================

      // Add Comment
      if (url.pathname === "/api/comments/add" && method === "POST") {
        const form = await request.formData();
        const userId = form.get("user_id");
        const entityType = form.get("entity_type");
        const entityId = form.get("entity_id");
        const content = form.get("content");
        const parentId = form.get("parent_id") || null;

        const commentId = generateId();
        await db.addComment(commentId, userId, entityType, entityId, content, parentId);

        return new Response(
          JSON.stringify({
            success: true,
            commentId,
            message: "Comment added",
          }),
          { headers: corsHeaders }
        );
      }

      // Get Comment
      if (url.pathname.match(/^\/api\/comments\/[\w-]+$/) && method === "GET") {
        const commentId = url.pathname.split("/").pop();

        const comment = await db.getComment(commentId);

        return new Response(
          JSON.stringify(comment || { error: "Comment not found" }),
          { headers: corsHeaders }
        );
      }

      // Get Comments for Entity
      if (url.pathname === "/api/comments/list" && method === "GET") {
        const entityType = url.searchParams.get("entity_type");
        const entityId = url.searchParams.get("entity_id");
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        const comments = await db.getComments(entityType, entityId, limit, offset);
        const count = await db.getCommentCount(entityType, entityId);

        return new Response(
          JSON.stringify({
            comments,
            count,
          }),
          { headers: corsHeaders }
        );
      }

      // Get Comment Replies
      if (url.pathname === "/api/comments/replies" && method === "GET") {
        const parentId = url.searchParams.get("parent_id");
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        const replies = await db.getCommentReplies(parentId, limit, offset);

        return new Response(
          JSON.stringify({
            replies,
          }),
          { headers: corsHeaders }
        );
      }

      // Update Comment
      if (url.pathname === "/api/comments/update" && method === "POST") {
        const form = await request.formData();
        const commentId = form.get("comment_id");
        const content = form.get("content");

        await db.updateComment(commentId, content);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Comment updated",
          }),
          { headers: corsHeaders }
        );
      }

      // Delete Comment
      if (url.pathname === "/api/comments/delete" && method === "POST") {
        const form = await request.formData();
        const commentId = form.get("comment_id");

        await db.deleteComment(commentId);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Comment deleted",
          }),
          { headers: corsHeaders }
        );
      }

      // Like Comment
      if (url.pathname === "/api/comments/like" && method === "POST") {
        const form = await request.formData();
        const commentId = form.get("comment_id");

        await db.incrementCommentLikes(commentId);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Comment liked",
          }),
          { headers: corsHeaders }
        );
      }

      // Unlike Comment
      if (url.pathname === "/api/comments/unlike" && method === "POST") {
        const form = await request.formData();
        const commentId = form.get("comment_id");

        await db.decrementCommentLikes(commentId);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Comment unliked",
          }),
          { headers: corsHeaders }
        );
      }

      // ===================================================================
      // SHARES (Universal for Posts, Reels, etc.)
      // ===================================================================

      // Add Share
      if (url.pathname === "/api/shares/add" && method === "POST") {
        const form = await request.formData();
        const userId = form.get("user_id");
        const entityType = form.get("entity_type");
        const entityId = form.get("entity_id");
        const shareType = form.get("share_type") || null;
        const targetUserId = form.get("target_user_id") || null;

        const shareId = generateId();
        await db.addShare(shareId, userId, entityType, entityId, shareType, targetUserId);

        return new Response(
          JSON.stringify({
            success: true,
            shareId,
            message: "Share recorded",
          }),
          { headers: corsHeaders }
        );
      }

      // Get Shares for Entity
      if (url.pathname === "/api/shares/list" && method === "GET") {
        const entityType = url.searchParams.get("entity_type");
        const entityId = url.searchParams.get("entity_id");
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        const shares = await db.getShares(entityType, entityId, limit, offset);
        const count = await db.getShareCount(entityType, entityId);

        return new Response(
          JSON.stringify({
            shares,
            count,
          }),
          { headers: corsHeaders }
        );
      }

      // Get Share Count
      if (url.pathname === "/api/shares/count" && method === "GET") {
        const entityType = url.searchParams.get("entity_type");
        const entityId = url.searchParams.get("entity_id");

        const count = await db.getShareCount(entityType, entityId);

        return new Response(
          JSON.stringify({
            count,
          }),
          { headers: corsHeaders }
        );
      }

      // Get User Shares
      if (url.pathname === "/api/shares/user" && method === "GET") {
        const userId = url.searchParams.get("user_id");
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        const shares = await db.getUserShares(userId, limit, offset);

        return new Response(
          JSON.stringify({
            shares,
          }),
          { headers: corsHeaders }
        );
      }

      // Get Shares Received by User
      if (url.pathname === "/api/shares/received" && method === "GET") {
        const targetUserId = url.searchParams.get("target_user_id");
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        const shares = await db.getSharesByTargetUser(targetUserId, limit, offset);

        return new Response(
          JSON.stringify({
            shares,
          }),
          { headers: corsHeaders }
        );
      }

      // ===================================================================
      // REPORTS (MODERATION)
      // ===================================================================

      // Report Content
      if (url.pathname === "/api/reports/create" && method === "POST") {
        const form = await request.formData();
        const reporterId = form.get("reporter_id");
        const entityType = form.get("entity_type");
        const entityId = form.get("entity_id");
        const reasonCode = form.get("reason_code");
        const description = form.get("description");

        const reportId = generateId();
        await db.addReport(reportId, reporterId, entityType, entityId, reasonCode, description);

        return new Response(
          JSON.stringify({
            success: true,
            reportId,
            message: "Report submitted",
          }),
          { headers: corsHeaders }
        );
      }

      // Get Report
      if (url.pathname.match(/^\/api\/reports\/[\w-]+$/) && method === "GET") {
        const reportId = url.pathname.split("/").pop();
        const report = await db.getReport(reportId);

        return new Response(
          JSON.stringify(report || { error: "Report not found" }),
          { headers: corsHeaders }
        );
      }

      // Get Reports for Entity
      if (url.pathname === "/api/reports/entity" && method === "GET") {
        const entityType = url.searchParams.get("entity_type");
        const entityId = url.searchParams.get("entity_id");
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        const reports = await db.getReports(entityType, entityId, limit, offset);

        return new Response(
          JSON.stringify({ reports }),
          { headers: corsHeaders }
        );
      }

      // Get Pending Reports
      if (url.pathname === "/api/reports/pending" && method === "GET") {
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        const reports = await db.getPendingReports(limit, offset);

        return new Response(
          JSON.stringify({ reports }),
          { headers: corsHeaders }
        );
      }

      // Update Report Status
      if (url.pathname === "/api/reports/status" && method === "POST") {
        const form = await request.formData();
        const reportId = form.get("report_id");
        const status = form.get("status");

        await db.updateReportStatus(reportId, status);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Report status updated",
          }),
          { headers: corsHeaders }
        );
      }

      // ===================================================================
      // BLOCKS (USER BLOCKING)
      // ===================================================================

      // Block User
      if (url.pathname === "/api/blocks/add" && method === "POST") {
        const form = await request.formData();
        const blockerId = form.get("blocker_id");
        const blockedId = form.get("blocked_id");

        const blockId = generateId();
        await db.blockUser(blockId, blockerId, blockedId);

        return new Response(
          JSON.stringify({
            success: true,
            blockId,
            message: "User blocked",
          }),
          { headers: corsHeaders }
        );
      }

      // Unblock User
      if (url.pathname === "/api/blocks/remove" && method === "POST") {
        const form = await request.formData();
        const blockerId = form.get("blocker_id");
        const blockedId = form.get("blocked_id");

        await db.unblockUser(blockerId, blockedId);

        return new Response(
          JSON.stringify({
            success: true,
            message: "User unblocked",
          }),
          { headers: corsHeaders }
        );
      }

      // Check if Blocked
      if (url.pathname === "/api/blocks/check" && method === "GET") {
        const blockerId = url.searchParams.get("blocker_id");
        const blockedId = url.searchParams.get("blocked_id");

        const blocked = await db.isBlocked(blockerId, blockedId);

        return new Response(
          JSON.stringify({ blocked }),
          { headers: corsHeaders }
        );
      }

      // Get Blocked Users
      if (url.pathname === "/api/blocks/list" && method === "GET") {
        const blockerId = url.searchParams.get("blocker_id");
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        const blockedUsers = await db.getBlockedUsers(blockerId, limit, offset);

        return new Response(
          JSON.stringify({ blockedUsers }),
          { headers: corsHeaders }
        );
      }

      // ===================================================================
      // STATS - USER STATISTICS
      // ===================================================================

      // Update User Stats
      if (url.pathname === "/api/stats/user/update" && method === "POST") {
        const form = await request.formData();
        const userId = form.get("user_id");

        const statsObject = {};
        const statFields = [
          "followers_count", "following_count", "posts_count",
          "total_likes", "total_comments", "total_views", "total_shares", "total_earnings"
        ];

        for (const field of statFields) {
          const value = form.get(field);
          if (value !== null) {
            statsObject[field] = parseInt(value) || 0;
          }
        }

        await db.updateUserStats(userId, statsObject);

        return new Response(
          JSON.stringify({
            success: true,
            message: "User stats updated",
          }),
          { headers: corsHeaders }
        );
      }

      // Get User Stats
      if (url.pathname.match(/^\/api\/stats\/user\/[\w-]+$/) && method === "GET") {
        const userId = url.pathname.split("/").pop();
        const stats = await db.getUserStats(userId);

        return new Response(
          JSON.stringify(stats || { error: "Stats not found" }),
          { headers: corsHeaders }
        );
      }

      // ===================================================================
      // STATS - POST STATISTICS
      // ===================================================================

      // Get Post Stats
      if (url.pathname.match(/^\/api\/stats\/post\/[\w-]+$/) && method === "GET") {
        const postId = url.pathname.split("/").pop();
        const stats = await db.getPostStats(postId);

        return new Response(
          JSON.stringify(stats || { error: "Stats not found" }),
          { headers: corsHeaders }
        );
      }

      // Increment Post Stat
      if (url.pathname === "/api/stats/post/increment" && method === "POST") {
        const form = await request.formData();
        const postId = form.get("post_id");
        const statField = form.get("stat_field");
        const increment = parseInt(form.get("increment") || "1");

        await db.incrementPostStat(postId, statField, increment);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Post ${statField} incremented`,
          }),
          { headers: corsHeaders }
        );
      }

      // ===================================================================
      // STATS - STORY STATISTICS
      // ===================================================================

      // Get Story Stats
      if (url.pathname.match(/^\/api\/stats\/story\/[\w-]+$/) && method === "GET") {
        const storyId = url.pathname.split("/").pop();
        const stats = await db.getStoryStats(storyId);

        return new Response(
          JSON.stringify(stats || { error: "Stats not found" }),
          { headers: corsHeaders }
        );
      }

      // Increment Story Stat
      if (url.pathname === "/api/stats/story/increment" && method === "POST") {
        const form = await request.formData();
        const storyId = form.get("story_id");
        const statField = form.get("stat_field");
        const increment = parseInt(form.get("increment") || "1");

        await db.incrementStoryStat(storyId, statField, increment);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Story ${statField} incremented`,
          }),
          { headers: corsHeaders }
        );
      }

      // ===================================================================
      // STATS - POLL STATISTICS
      // ===================================================================

      // Get Poll Stats
      if (url.pathname.match(/^\/api\/stats\/poll\/[\w-]+$/) && method === "GET") {
        const pollId = url.pathname.split("/").pop();
        const stats = await db.getPollStats(pollId);

        return new Response(
          JSON.stringify(stats || { error: "Stats not found" }),
          { headers: corsHeaders }
        );
      }

      // Increment Poll Stat
      if (url.pathname === "/api/stats/poll/increment" && method === "POST") {
        const form = await request.formData();
        const pollId = form.get("poll_id");
        const statField = form.get("stat_field");
        const increment = parseInt(form.get("increment") || "1");

        await db.incrementPollStat(pollId, statField, increment);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Poll ${statField} incremented`,
          }),
          { headers: corsHeaders }
        );
      }

      // ===================================================================
      // STATS - EVENT STATISTICS
      // ===================================================================

      // Get Event Stats
      if (url.pathname.match(/^\/api\/stats\/event\/[\w-]+$/) && method === "GET") {
        const eventId = url.pathname.split("/").pop();
        const stats = await db.getEventStats(eventId);

        return new Response(
          JSON.stringify(stats || { error: "Stats not found" }),
          { headers: corsHeaders }
        );
      }

      // Increment Event Stat
      if (url.pathname === "/api/stats/event/increment" && method === "POST") {
        const form = await request.formData();
        const eventId = form.get("event_id");
        const statField = form.get("stat_field");
        const increment = parseInt(form.get("increment") || "1");

        await db.incrementEventStat(eventId, statField, increment);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Event ${statField} incremented`,
          }),
          { headers: corsHeaders }
        );
      }

      // ===================================================================
      // STATS - GROUP STATISTICS
      // ===================================================================

      // Get Group Stats
      if (url.pathname.match(/^\/api\/stats\/group\/[\w-]+$/) && method === "GET") {
        const groupId = url.pathname.split("/").pop();
        const stats = await db.getGroupStats(groupId);

        return new Response(
          JSON.stringify(stats || { error: "Stats not found" }),
          { headers: corsHeaders }
        );
      }

      // Increment Group Stat
      if (url.pathname === "/api/stats/group/increment" && method === "POST") {
        const form = await request.formData();
        const groupId = form.get("group_id");
        const statField = form.get("stat_field");
        const increment = parseInt(form.get("increment") || "1");

        await db.incrementGroupStat(groupId, statField, increment);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Group ${statField} incremented`,
          }),
          { headers: corsHeaders }
        );
      }

      // ===================================================================
      // STATS - CONTENT STATISTICS (UNIVERSAL)
      // ===================================================================

      // Get Content Stats
      if (url.pathname === "/api/stats/content" && method === "GET") {
        const entityType = url.searchParams.get("entity_type");
        const entityId = url.searchParams.get("entity_id");

        const stats = await db.getContentStats(entityType, entityId);

        return new Response(
          JSON.stringify(stats || { error: "Stats not found" }),
          { headers: corsHeaders }
        );
      }

      // Increment Content Stat
      if (url.pathname === "/api/stats/content/increment" && method === "POST") {
        const form = await request.formData();
        const entityType = form.get("entity_type");
        const entityId = form.get("entity_id");
        const statField = form.get("stat_field");
        const increment = parseInt(form.get("increment") || "1");

        await db.incrementContentStat(entityType, entityId, statField, increment);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Content ${statField} incremented`,
          }),
          { headers: corsHeaders }
        );
      }

      // ===================================================================
      // EARNINGS
      // ===================================================================

      // Add Earning
      if (url.pathname === "/api/earnings/add" && method === "POST") {
        const form = await request.formData();
        const userId = form.get("user_id");
        const sourceType = form.get("source_type");
        const sourceId = form.get("source_id");
        const amount = parseInt(form.get("amount") || "0");

        const earningId = generateId();
        await db.addEarning(earningId, userId, sourceType, sourceId, amount);

        return new Response(
          JSON.stringify({
            success: true,
            earningId,
            message: "Earning recorded",
          }),
          { headers: corsHeaders }
        );
      }

      // Get User Earnings
      if (url.pathname === "/api/earnings/list" && method === "GET") {
        const userId = url.searchParams.get("user_id");
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        const earnings = await db.getUserEarnings(userId, limit, offset);

        return new Response(
          JSON.stringify({ earnings }),
          { headers: corsHeaders }
        );
      }

      // Get Total Earnings
      if (url.pathname === "/api/earnings/total" && method === "GET") {
        const userId = url.searchParams.get("user_id");
        const total = await db.getTotalEarnings(userId);

        return new Response(
          JSON.stringify({ total }),
          { headers: corsHeaders }
        );
      }

      // Get Earnings by Source
      if (url.pathname === "/api/earnings/source" && method === "GET") {
        const userId = url.searchParams.get("user_id");
        const sourceType = url.searchParams.get("source_type");
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        const earnings = await db.getEarningsBySource(userId, sourceType, limit, offset);

        return new Response(
          JSON.stringify({ earnings }),
          { headers: corsHeaders }
        );
      }

      // ===================================================================
      // DAILY STATS
      // ===================================================================

      // Add/Update Daily Stat
      if (url.pathname === "/api/daily-stats/update" && method === "POST") {
        const form = await request.formData();
        const userId = form.get("user_id");
        const date = form.get("date") || new Date().toISOString().split("T")[0];

        const statsObject = {};
        const statFields = [
          "followers", "following", "new_followers", "posts", "reels",
          "views", "likes", "comments", "shares", "saves",
          "story_views", "reel_views", "watch_time", "earnings"
        ];

        for (const field of statFields) {
          const value = form.get(field);
          if (value !== null) {
            statsObject[field] = field === "watch_time" ? parseFloat(value) : parseInt(value) || 0;
          }
        }

        const statId = generateId();
        await db.addDailyStat(statId, userId, date, statsObject);

        return new Response(
          JSON.stringify({
            success: true,
            statId,
            message: "Daily stats updated",
          }),
          { headers: corsHeaders }
        );
      }

      // Get Daily Stat for Specific Date
      if (url.pathname === "/api/daily-stats/date" && method === "GET") {
        const userId = url.searchParams.get("user_id");
        const date = url.searchParams.get("date");

        const stat = await db.getDailyStat(userId, date);

        return new Response(
          JSON.stringify(stat || { error: "Stat not found" }),
          { headers: corsHeaders }
        );
      }

      // Get User Daily Stats (Last 30 days)
      if (url.pathname === "/api/daily-stats/user" && method === "GET") {
        const userId = url.searchParams.get("user_id");
        const limit = parseInt(url.searchParams.get("limit") || "30");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        const stats = await db.getUserDailyStats(userId, limit, offset);

        return new Response(
          JSON.stringify({ stats }),
          { headers: corsHeaders }
        );
      }

      // Get Daily Stats by Date Range
      if (url.pathname === "/api/daily-stats/range" && method === "GET") {
        const userId = url.searchParams.get("user_id");
        const startDate = url.searchParams.get("start_date");
        const endDate = url.searchParams.get("end_date");

        const stats = await db.getDailyStatsByDateRange(userId, startDate, endDate);

        return new Response(
          JSON.stringify({ stats }),
          { headers: corsHeaders }
        );
      }

      // ===================================================================
      // DEFAULT 404
      // ===================================================================
      return new Response(
        JSON.stringify({ error: "Endpoint not found" }),
        { status: 404, headers: corsHeaders }
      );
    } catch (error) {
      console.error("Error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }
  },
};
