/**
 * PROJECT: SHORTSTALKSYRA
 * COMPONENT: Cloudflare Worker REST API
 * DATABASE: D1 | STORAGE: R2
 * 
 * Features:
 * 1. REST API - HTTP requests (posts, user, social, etc.)
 * 2. WebSocket - Real-time messaging aur P2P signaling
 * 3. Durable Objects - User session management aur routing
 *
 * Ye code apk se aane wale HTTP requests ko handle karta hai.
 * Har section ke upar comment diya gaya hai ki yeh kiska code hai.
 */

import Database from "./database/db.js";
import { UserSession } from "./durable-objects/user-session.js";

export { UserSession };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // ===================================================================
    // WEBSOCKET HANDLER - Real-time messaging aur P2P signaling
    // ===================================================================
    if (url.protocol === "ws:" || url.protocol === "wss:") {
      return await handleWebSocket(request, env, url);
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

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

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ===================================================================
      // USER SYSTEM - Register, Login, Profile, Search
      // ===================================================================

      // Register User: apk se naya user create karna
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

        return new Response("User Registered", { status: 200, headers: corsHeaders });
      }

      // Login User: apk se username/password check karna
      if (url.pathname === "/api/user/login" && method === "POST") {
        const form = await request.formData();
        const user = form.get("username")?.toLowerCase() || "";
        const pass = form.get("password") || "";

        const userData = await env.DB.prepare(
          "SELECT * FROM users WHERE (username = ? OR email = ?) AND password = ?"
        )
          .bind(user, user, pass)
          .first();

        if (!userData) {
          return new Response("Invalid Credentials", { status: 401, headers: corsHeaders });
        }

        userData.profilePicUrl = ensurePublicUrl(userData.profilePicUrl);

        return new Response(JSON.stringify(userData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Profile Fetch / Check: apk se user detail lana
      if (url.pathname === "/api/user/check" && method === "GET") {
        const userId = url.searchParams.get("userId");
        const user = await env.DB.prepare("SELECT * FROM users WHERE userId = ?")
          .bind(userId)
          .first();
        if (user) {
          user.profilePicUrl = ensurePublicUrl(user.profilePicUrl);
        }

        return new Response(JSON.stringify(user), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update Profile: apk se user profile edit karna
      if (url.pathname === "/api/user/update" && method === "POST") {
        const form = await request.formData();
        const userId = form.get("userId");
        const username = form.get("username")?.toLowerCase().replace(/\s+/g, "") || "";
        const fullName = form.get("fullName") || "";
        const bio = form.get("bio") || "";
        const location = form.get("location") || "";
        const website = form.get("website") || "";
        const birthDate = form.get("birthDate") || null;
        const profilePic = form.get("profilePic");
        const coverPic = form.get("coverPic");

        let updateQuery = "UPDATE users SET username = ?, fullName = ?, bio = ?, location = ?, website = ?, birthDate = ?";
        const params = [username, fullName, bio, location, website, birthDate];

        if (profilePic && profilePic.size > 0) {
          const fileName = `profiles/${userId}_p_${Date.now()}.jpg`;
          await env.BUCKET.put(fileName, profilePic.stream());
          updateQuery += ", profilePicUrl = ?";
          params.push(`${publicUrl}/${fileName}`);
        }

        if (coverPic && coverPic.size > 0) {
          const fileName = `covers/${userId}_c_${Date.now()}.jpg`;
          await env.BUCKET.put(fileName, coverPic.stream());
          updateQuery += ", coverPicUrl = ?";
          params.push(`${publicUrl}/${fileName}`);
        }

        updateQuery += " WHERE userId = ?";
        params.push(userId);

        await env.DB.prepare(updateQuery).bind(...params).run();
        return new Response("Profile Updated", { status: 200, headers: corsHeaders });
      }

      // Search Users: apk se username/fullname search karna
      if (url.pathname === "/api/user/search" && method === "GET") {
        const query = url.searchParams.get("query") || "";
        const { results } = await env.DB.prepare(
          "SELECT userId, username, fullName, profilePicUrl, isVerified FROM users WHERE username LIKE ? OR fullName LIKE ? LIMIT 20"
        )
          .bind(`%${query}%`, `%${query}%`)
          .all();

        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ===================================================================
      // POST SYSTEM - Create, Read, Update, Delete Posts
      // MIDDLE MAN: APK <-> Database (D1)
      // ===================================================================

      // ✅ CREATE POST: apk se naya post create karna + media upload karna
      // APK bhejtega: userId, username, type, content, media, thumbnail, metadata, etc.
      if (url.pathname === "/api/posts/create" && method === "POST") {
        const form = await request.formData();
        
        // Extract form data
        const userId = form.get("userId");
        const username = form.get("username") || "User";
        const userImage = form.get("userImage") || defaultProfilePicUrl;
        const isVerified = parseInt(form.get("isVerified")) || 0;
        const type = form.get("type") || (media ? "video" : "post"); // Auto-detect: 'video' if media uploaded, else 'post'
        const content = form.get("content") || "";
        const language = form.get("language") || "en";
        const visibility = form.get("visibility") || "public";
        const allowComments = parseInt(form.get("allowComments")) || 1;
        const isNsfw = parseInt(form.get("isNsfw")) || 0;
        
        // Location data
        const locationName = form.get("locationName") || null;
        const lat = form.get("lat") ? parseFloat(form.get("lat")) : null;
        const lng = form.get("lng") ? parseFloat(form.get("lng")) : null;
        
        // Media info
        const aspectRatio = form.get("aspectRatio") ? parseFloat(form.get("aspectRatio")) : 1.0;
        const duration = form.get("duration") ? parseFloat(form.get("duration")) : 0;
        
        // Tags and metadata
        const tags = form.get("tags") || "";
        const metadata = form.get("metadata") || "";
        const adLink = form.get("adLink") || null;
        const isPromoted = parseInt(form.get("isPromoted")) || 0;
        const coinReward = parseInt(form.get("coinReward")) || 0;

        // Upload media to R2
        let mediaUrl = null;
        let thumbnailUrl = null;
        let fileSize = null;

        const media = form.get("media");
        if (media && typeof media !== "string" && media.size > 0) {
          const fileName = `posts/${userId}/${Date.now()}_${media.name || "media"}`;
          await env.BUCKET.put(fileName, media.stream());
          mediaUrl = `${publicUrl}/${fileName}`;
          fileSize = media.size;
        }

        const thumbnail = form.get("thumbnail");
        if (thumbnail && typeof thumbnail !== "string" && thumbnail.size > 0) {
          const fileName = `thumbnails/${userId}/${Date.now()}_thumb.jpg`;
          await env.BUCKET.put(fileName, thumbnail.stream());
          thumbnailUrl = `${publicUrl}/${fileName}`;
        }

        // Generate unique postId
        const postId = `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const timestamp = new Date().toISOString();

        // Insert into posts table
        await env.DB.prepare(
          `INSERT INTO posts (
            postId, userId, username, userImage, isVerified, type, content,
            mediaUrl, thumbnailUrl, metadata, tags, language,
            likeCount, commentCount, repostCount, viewsCount, saveCount, clickCount,
            locationName, lat, lng, aspectRatio, duration, fileSize,
            status, isNsfw, allowComments, visibility, isPromoted, adLink, coinReward,
            timestamp, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            postId, userId, username, userImage, isVerified, type, content,
            mediaUrl, thumbnailUrl, metadata, tags, language,
            locationName, lat, lng, aspectRatio, duration, fileSize,
            isNsfw, allowComments, visibility, isPromoted, adLink, coinReward,
            timestamp, timestamp
          )
          .run();

        // Update user postCount
        await env.DB.prepare("UPDATE users SET postCount = postCount + 1 WHERE userId = ?")
          .bind(userId)
          .run();

        return new Response(
          JSON.stringify({ 
            success: true, 
            postId: postId,
            mediaUrl: mediaUrl,
            thumbnailUrl: thumbnailUrl,
            message: "Post created successfully"
          }),
          { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ✅ FETCH FEED POSTS: apk se feed list lana (sab users ke posts)
      if (url.pathname === "/api/posts/feed" && method === "GET") {
        const limit = parseInt(url.searchParams.get("limit")) || 50;
        const offset = parseInt(url.searchParams.get("offset")) || 0;
        const { results } = await env.DB.prepare(
          "SELECT * FROM posts WHERE status = 'active' AND visibility = 'public' ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        )
          .bind(limit, offset)
          .all();

        return new Response(JSON.stringify({ success: true, posts: results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ✅ FETCH USER POSTS: kisi specific user ke sab posts lana
      if (url.pathname.match(/^\/api\/posts\/user\/\w+$/) && method === "GET") {
        const userId = url.pathname.split("/").pop();
        const { results } = await env.DB.prepare(
          "SELECT * FROM posts WHERE userId = ? AND status = 'active' ORDER BY timestamp DESC LIMIT 100"
        )
          .bind(userId)
          .all();

        return new Response(JSON.stringify({ success: true, posts: results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ✅ FETCH SINGLE POST: ek specific post detail lana
      if (url.pathname.match(/^\/api\/posts\/detail\/\w+/) && method === "GET") {
        const postId = url.pathname.split("/").pop();
        const post = await env.DB.prepare(
          "SELECT * FROM posts WHERE postId = ?"
        )
          .bind(postId)
          .first();

        if (!post) {
          return new Response(JSON.stringify({ success: false, message: "Post not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, post: post }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ✅ UPDATE POST: existing post ko edit karna (content, tags, etc)
      if (url.pathname === "/api/posts/update" && method === "POST") {
        const form = await request.formData();
        const postId = form.get("postId");
        const content = form.get("content");
        const tags = form.get("tags");
        const metadata = form.get("metadata");
        const visibility = form.get("visibility");
        const isNsfw = form.get("isNsfw");

        let updateQuery = "UPDATE posts SET ";
        const params = [];
        const updates = [];

        if (content !== null) {
          updates.push("content = ?");
          params.push(content);
        }
        if (tags !== null) {
          updates.push("tags = ?");
          params.push(tags);
        }
        if (metadata !== null) {
          updates.push("metadata = ?");
          params.push(metadata);
        }
        if (visibility !== null) {
          updates.push("visibility = ?");
          params.push(visibility);
        }
        if (isNsfw !== null) {
          updates.push("isNsfw = ?");
          params.push(parseInt(isNsfw));
        }

        updates.push("updatedAt = ?");
        params.push(new Date().toISOString());

        updateQuery += updates.join(", ") + " WHERE postId = ?";
        params.push(postId);

        await env.DB.prepare(updateQuery).bind(...params).run();

        return new Response(
          JSON.stringify({ success: true, message: "Post updated successfully" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ✅ DELETE POST: post ko delete karna
      if (url.pathname === "/api/posts/delete" && method === "POST") {
        const form = await request.formData();
        const postId = form.get("postId");
        const userId = form.get("userId");

        const post = await env.DB.prepare("SELECT * FROM posts WHERE postId = ?")
          .bind(postId)
          .first();

        if (!post) {
          return new Response(JSON.stringify({ success: false, message: "Post not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (post.userId !== userId) {
          return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await env.DB.prepare("UPDATE posts SET status = 'deleted' WHERE postId = ?")
          .bind(postId)
          .run();

        await env.DB.prepare("UPDATE users SET postCount = postCount - 1 WHERE userId = ?")
          .bind(userId)
          .run();

        return new Response(
          JSON.stringify({ success: true, message: "Post deleted successfully" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ✅ INCREMENT VIEW COUNT: jab koi post dekhta hai
      if (url.pathname === "/api/posts/view" && method === "POST") {
        const form = await request.formData();
        const postId = form.get("postId");

        await env.DB.prepare("UPDATE posts SET viewsCount = viewsCount + 1 WHERE postId = ?")
          .bind(postId)
          .run();

        return new Response(
          JSON.stringify({ success: true, message: "View counted" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ✅ INCREMENT CLICK COUNT: jab koi ad/link click karta hai
      if (url.pathname === "/api/posts/click" && method === "POST") {
        const form = await request.formData();
        const postId = form.get("postId");

        await env.DB.prepare("UPDATE posts SET clickCount = clickCount + 1 WHERE postId = ?")
          .bind(postId)
          .run();

        return new Response(
          JSON.stringify({ success: true, message: "Click counted" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Old compatibility endpoint
      if (url.pathname === "/api/posts" && method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT * FROM posts WHERE status = 'active' ORDER BY timestamp DESC LIMIT 50"
        ).all();
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ===================================================================
      // SOCIAL SYSTEM - Like, Comment, Repost, Save
      // ===================================================================

      // ✅ LIKE POST: apk se post like karna
      if (url.pathname === "/api/social/like" && method === "POST") {
        const form = await request.formData();
        const userId = form.get("userId");
        const postId = form.get("postId");

        // Check if already liked
        const existingLike = await env.DB.prepare("SELECT * FROM likes WHERE userId = ? AND postId = ?")
          .bind(userId, postId)
          .first();

        if (existingLike) {
          return new Response(JSON.stringify({ success: false, message: "Already liked" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const likeId = `like_${userId}_${postId}_${Date.now()}`;
        
        await env.DB.prepare(
          "INSERT INTO likes (likeId, userId, postId, timestamp) VALUES (?, ?, ?, ?)"
        )
          .bind(likeId, userId, postId, new Date().toISOString())
          .run();

        await env.DB.prepare("UPDATE posts SET likeCount = likeCount + 1 WHERE postId = ?")
          .bind(postId)
          .run();

        return new Response(JSON.stringify({ success: true, message: "Post liked" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ✅ UNLIKE POST: apk se like remove karna
      if (url.pathname === "/api/social/unlike" && method === "POST") {
        const form = await request.formData();
        const userId = form.get("userId");
        const postId = form.get("postId");

        await env.DB.prepare("DELETE FROM likes WHERE userId = ? AND postId = ?")
          .bind(userId, postId)
          .run();

        await env.DB.prepare("UPDATE posts SET likeCount = likeCount - 1 WHERE postId = ? AND likeCount > 0")
          .bind(postId)
          .run();

        return new Response(JSON.stringify({ success: true, message: "Like removed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ✅ SAVE POST: apk se post save/bookmark karna
      if (url.pathname === "/api/social/save" && method === "POST") {
        const form = await request.formData();
        const userId = form.get("userId");
        const postId = form.get("postId");

        const saveId = `save_${userId}_${postId}_${Date.now()}`;
        
        await env.DB.prepare(
          "INSERT OR IGNORE INTO saved_posts (saveId, userId, postId, timestamp) VALUES (?, ?, ?, ?)"
        )
          .bind(saveId, userId, postId, new Date().toISOString())
          .run();

        await env.DB.prepare("UPDATE posts SET saveCount = saveCount + 1 WHERE postId = ?")
          .bind(postId)
          .run();

        return new Response(JSON.stringify({ success: true, message: "Post saved" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ✅ UNSAVE POST: apk se saved post remove karna
      if (url.pathname === "/api/social/unsave" && method === "POST") {
        const form = await request.formData();
        const userId = form.get("userId");
        const postId = form.get("postId");

        await env.DB.prepare("DELETE FROM saved_posts WHERE userId = ? AND postId = ?")
          .bind(userId, postId)
          .run();

        await env.DB.prepare("UPDATE posts SET saveCount = saveCount - 1 WHERE postId = ? AND saveCount > 0")
          .bind(postId)
          .run();

        return new Response(JSON.stringify({ success: true, message: "Post unsaved" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ✅ ADD COMMENT: apk se post par comment add karna
      if (url.pathname === "/api/social/comment" && method === "POST") {
        const data = await request.json();
        const commentId = `comment_${data.userId}_${data.postId}_${Date.now()}`;

        await env.DB.prepare(
          `INSERT INTO comments (
            commentId, postId, userId, username, userImage, content, 
            status, isNsfw, timestamp, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`
        )
          .bind(
            commentId, 
            data.postId, 
            data.userId, 
            data.username, 
            data.userImage || defaultProfilePicUrl,
            data.content,
            data.isNsfw || 0,
            new Date().toISOString(),
            new Date().toISOString()
          )
          .run();

        await env.DB.prepare("UPDATE posts SET commentCount = commentCount + 1 WHERE postId = ?")
          .bind(data.postId)
          .run();

        return new Response(JSON.stringify({ success: true, commentId: commentId, message: "Comment added" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ✅ FETCH POST COMMENTS: kisi post ke sab comments lana
      if (url.pathname.match(/^\/api\/comments\/post\//) && method === "GET") {
        const postId = url.pathname.split("/").pop();
        const { results } = await env.DB.prepare(
          "SELECT * FROM comments WHERE postId = ? AND status = 'active' ORDER BY timestamp DESC"
        )
          .bind(postId)
          .all();

        return new Response(JSON.stringify({ success: true, comments: results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ✅ REPOST/SHARE: post ko repost karna
      if (url.pathname === "/api/social/repost" && method === "POST") {
        const form = await request.formData();
        const userId = form.get("userId");
        const originalPostId = form.get("postId");
        const caption = form.get("caption") || "";

        // Get original post details
        const originalPost = await env.DB.prepare("SELECT * FROM posts WHERE postId = ?")
          .bind(originalPostId)
          .first();

        if (!originalPost) {
          return new Response(JSON.stringify({ success: false, message: "Original post not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const repostId = `repost_${userId}_${originalPostId}_${Date.now()}`;

        await env.DB.prepare(
          "INSERT INTO reposts (repostId, userId, originalPostId, originalUserId, caption, timestamp) VALUES (?, ?, ?, ?, ?, ?)"
        )
          .bind(repostId, userId, originalPostId, originalPost.userId, caption, new Date().toISOString())
          .run();

        await env.DB.prepare("UPDATE posts SET repostCount = repostCount + 1 WHERE postId = ?")
          .bind(originalPostId)
          .run();

        return new Response(JSON.stringify({ success: true, repostId: repostId, message: "Post reposted" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ✅ FOLLOW USER: apk se user follow karna
      if (url.pathname === "/api/social/follow" && method === "POST") {
        const form = await request.formData();
        const followerId = form.get("followerId");
        const followingId = form.get("followingId");

        // Check if already following
        const existing = await env.DB.prepare("SELECT * FROM follows WHERE followerId = ? AND followingId = ?")
          .bind(followerId, followingId)
          .first();

        if (existing) {
          return new Response(JSON.stringify({ success: false, message: "Already following" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await env.DB.prepare(
          "INSERT INTO follows (followerId, followingId, timestamp) VALUES (?, ?, ?)"
        )
          .bind(followerId, followingId, new Date().toISOString())
          .run();

        await env.DB.prepare("UPDATE users SET followingCount = followingCount + 1 WHERE userId = ?")
          .bind(followerId)
          .run();

        await env.DB.prepare("UPDATE users SET followerCount = followerCount + 1 WHERE userId = ?")
          .bind(followingId)
          .run();

        return new Response(JSON.stringify({ success: true, message: "User followed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ✅ UNFOLLOW USER: apk se user unfollow karna
      if (url.pathname === "/api/social/unfollow" && method === "POST") {
        const form = await request.formData();
        const followerId = form.get("followerId");
        const followingId = form.get("followingId");

        await env.DB.prepare("DELETE FROM follows WHERE followerId = ? AND followingId = ?")
          .bind(followerId, followingId)
          .run();

        await env.DB.prepare("UPDATE users SET followingCount = followingCount - 1 WHERE userId = ? AND followingCount > 0")
          .bind(followerId)
          .run();

        await env.DB.prepare("UPDATE users SET followerCount = followerCount - 1 WHERE userId = ? AND followerCount > 0")
          .bind(followingId)
          .run();

        return new Response(JSON.stringify({ success: true, message: "User unfollowed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ===================================================================
      // FOLLOWERS SYSTEM - New Advanced Followers Table
      // ===================================================================

      // ✅ ADD FOLLOWER: naya follower relationship create karo
      if (url.pathname === "/api/followers/add" && method === "POST") {
        const form = await request.formData();
        const followerId = form.get("follower_id");
        const followingId = form.get("following_id");
        const status = form.get("status") || "accepted";
        const source = form.get("source") || null;

        // Check if relationship already exists
        const existing = await env.DB.prepare(
          "SELECT * FROM followers WHERE follower_id = ? AND following_id = ?"
        )
          .bind(followerId, followingId)
          .first();

        if (existing) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: "Follower relationship already exists" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const followerId_unique = `follower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Check for mutual following
        const mutualCheck = await env.DB.prepare(
          "SELECT * FROM followers WHERE follower_id = ? AND following_id = ?"
        )
          .bind(followingId, followerId)
          .first();

        const isMutual = mutualCheck ? 1 : 0;

        await env.DB.prepare(
          `INSERT INTO followers (id, follower_id, following_id, status, is_mutual, notifications_enabled, source, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            followerId_unique,
            followerId,
            followingId,
            status,
            isMutual,
            1, // notifications_enabled default
            source,
            new Date().toISOString(),
            new Date().toISOString()
          )
          .run();

        // Update user counts if status is accepted
        if (status === "accepted") {
          await env.DB.prepare(
            "UPDATE users SET followingCount = followingCount + 1 WHERE userId = ?"
          ).bind(followerId).run();

          await env.DB.prepare(
            "UPDATE users SET followerCount = followerCount + 1 WHERE userId = ?"
          ).bind(followingId).run();
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: "Follower added",
          id: followerId_unique,
          isMutual: isMutual === 1
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ✅ REMOVE FOLLOWER: follower relationship delete karo
      if (url.pathname === "/api/followers/remove" && method === "POST") {
        const form = await request.formData();
        const followerId = form.get("follower_id");
        const followingId = form.get("following_id");

        const follower = await env.DB.prepare(
          "SELECT status FROM followers WHERE follower_id = ? AND following_id = ?"
        )
          .bind(followerId, followingId)
          .first();

        if (!follower) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: "Follower relationship not found" 
          }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await env.DB.prepare(
          "DELETE FROM followers WHERE follower_id = ? AND following_id = ?"
        )
          .bind(followerId, followingId)
          .run();

        // Update user counts if status was accepted
        if (follower.status === "accepted") {
          await env.DB.prepare(
            "UPDATE users SET followingCount = followingCount - 1 WHERE userId = ? AND followingCount > 0"
          ).bind(followerId).run();

          await env.DB.prepare(
            "UPDATE users SET followerCount = followerCount - 1 WHERE userId = ? AND followerCount > 0"
          ).bind(followingId).run();
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: "Follower removed" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ✅ GET FOLLOWERS LIST: kisi user ke sab followers
      if (url.pathname.match(/^\/api\/followers\/list\/[^/]+$/) && method === "GET") {
        const userId = url.pathname.split("/")[4];
        const limit = parseInt(url.searchParams.get("limit")) || 50;
        const offset = parseInt(url.searchParams.get("offset")) || 0;
        const status = url.searchParams.get("status") || "accepted";

        const followers = await env.DB.prepare(
          `SELECT f.*, u.username, u.fullName, u.profilePicUrl, u.isVerified, u.bio
           FROM followers f
           JOIN users u ON f.follower_id = u.userId
           WHERE f.following_id = ? AND f.status = ?
           ORDER BY f.created_at DESC
           LIMIT ? OFFSET ?`
        )
          .bind(userId, status, limit, offset)
          .all();

        const totalCount = await env.DB.prepare(
          "SELECT COUNT(*) as count FROM followers WHERE following_id = ? AND status = ?"
        )
          .bind(userId, status)
          .first();

        return new Response(JSON.stringify({ 
          success: true, 
          followers: followers.results || [],
          total: totalCount.count || 0,
          limit,
          offset
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ✅ GET FOLLOWING LIST: jisko kisi ne follow kiya
      if (url.pathname.match(/^\/api\/followers\/following\/[^/]+$/) && method === "GET") {
        const userId = url.pathname.split("/")[4];
        const limit = parseInt(url.searchParams.get("limit")) || 50;
        const offset = parseInt(url.searchParams.get("offset")) || 0;
        const status = url.searchParams.get("status") || "accepted";

        const following = await env.DB.prepare(
          `SELECT f.*, u.username, u.fullName, u.profilePicUrl, u.isVerified, u.bio
           FROM followers f
           JOIN users u ON f.following_id = u.userId
           WHERE f.follower_id = ? AND f.status = ?
           ORDER BY f.created_at DESC
           LIMIT ? OFFSET ?`
        )
          .bind(userId, status, limit, offset)
          .all();

        const totalCount = await env.DB.prepare(
          "SELECT COUNT(*) as count FROM followers WHERE follower_id = ? AND status = ?"
        )
          .bind(userId, status)
          .first();

        return new Response(JSON.stringify({ 
          success: true, 
          following: following.results || [],
          total: totalCount.count || 0,
          limit,
          offset
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ✅ ACCEPT FOLLOWER REQUEST: pending request ko accept karo
      if (url.pathname === "/api/followers/accept" && method === "POST") {
        const form = await request.formData();
        const followerId = form.get("follower_id");
        const followingId = form.get("following_id");

        const follower = await env.DB.prepare(
          "SELECT * FROM followers WHERE follower_id = ? AND following_id = ?"
        )
          .bind(followerId, followingId)
          .first();

        if (!follower) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: "Follower request not found" 
          }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await env.DB.prepare(
          "UPDATE followers SET status = ?, updated_at = ? WHERE follower_id = ? AND following_id = ?"
        )
          .bind("accepted", new Date().toISOString(), followerId, followingId)
          .run();

        // Update user counts
        await env.DB.prepare(
          "UPDATE users SET followingCount = followingCount + 1 WHERE userId = ?"
        ).bind(followerId).run();

        await env.DB.prepare(
          "UPDATE users SET followerCount = followerCount + 1 WHERE userId = ?"
        ).bind(followingId).run();

        return new Response(JSON.stringify({ 
          success: true, 
          message: "Follower request accepted" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ✅ REJECT FOLLOWER REQUEST: pending request ko reject karo
      if (url.pathname === "/api/followers/reject" && method === "POST") {
        const form = await request.formData();
        const followerId = form.get("follower_id");
        const followingId = form.get("following_id");

        const follower = await env.DB.prepare(
          "SELECT * FROM followers WHERE follower_id = ? AND following_id = ?"
        )
          .bind(followerId, followingId)
          .first();

        if (!follower) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: "Follower request not found" 
          }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await env.DB.prepare(
          "DELETE FROM followers WHERE follower_id = ? AND following_id = ?"
        )
          .bind(followerId, followingId)
          .run();

        return new Response(JSON.stringify({ 
          success: true, 
          message: "Follower request rejected" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ✅ TOGGLE NOTIFICATIONS: follower ke notifications on/off karo
      if (url.pathname === "/api/followers/toggle-notifications" && method === "POST") {
        const form = await request.formData();
        const followerId = form.get("follower_id");
        const followingId = form.get("following_id");
        const notificationsEnabled = form.get("notifications_enabled") === "true" ? 1 : 0;

        const follower = await env.DB.prepare(
          "SELECT * FROM followers WHERE follower_id = ? AND following_id = ?"
        )
          .bind(followerId, followingId)
          .first();

        if (!follower) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: "Follower relationship not found" 
          }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await env.DB.prepare(
          "UPDATE followers SET notifications_enabled = ?, updated_at = ? WHERE follower_id = ? AND following_id = ?"
        )
          .bind(notificationsEnabled, new Date().toISOString(), followerId, followingId)
          .run();

        return new Response(JSON.stringify({ 
          success: true, 
          message: "Notification settings updated",
          notificationsEnabled: notificationsEnabled === 1
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ✅ GET FOLLOWER STATUS: check karo kya user follow kar raha hai
      if (url.pathname === "/api/followers/status" && method === "GET") {
        const followerId = url.searchParams.get("follower_id");
        const followingId = url.searchParams.get("following_id");

        const follower = await env.DB.prepare(
          `SELECT id, status, is_mutual, notifications_enabled 
           FROM followers 
           WHERE follower_id = ? AND following_id = ?`
        )
          .bind(followerId, followingId)
          .first();

        if (!follower) {
          return new Response(JSON.stringify({ 
            success: true, 
            isFollowing: false,
            status: null
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          isFollowing: true,
          status: follower.status,
          isMutual: follower.is_mutual === 1,
          notificationsEnabled: follower.notifications_enabled === 1
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ===================================================================
      // CHAT SYSTEM - Send message
      // ===================================================================

      // Chat Send: apk se message store karna
      if (url.pathname === "/api/chat/send" && method === "POST") {
        const message = await request.json();
        await env.DB.prepare(
          "INSERT INTO chats (senderId, receiverId, text, timestamp) VALUES (?, ?, ?, ?)"
        )
          .bind(message.senderId, message.receiverId, message.text, new Date().toISOString())
          .run();

        return new Response("Sent", { headers: corsHeaders });
      }

      // ===================================================================
      // MESSAGING SYSTEM - Conversations, Messages, Members
      // ===================================================================

      // CREATE CONVERSATION: naya chat group banao
      if (url.pathname === "/api/conversations/create" && method === "POST") {
        const data = await request.json();
        const conversationId = `conv_${Date.now()}`;
        
        await db.createConversation(
          conversationId,
          data.type, // "private" ya "group"
          data.name || null,
          data.image || null,
          data.createdBy
        );

        // Creator ko member banao
        await db.addMember(`member_${Date.now()}`, conversationId, data.createdBy, "admin");

        return new Response(JSON.stringify({ id: conversationId, success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // GET CONVERSATION: specific conversation ki details
      if (url.pathname.match(/^\/api\/conversations\/[^/]+$/) && method === "GET") {
        const conversationId = url.pathname.split("/")[3];
        const conversation = await db.getConversation(conversationId);

        if (!conversation) {
          return new Response(JSON.stringify({ error: "Conversation not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify(conversation), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // GET USER CONVERSATIONS: user ke sab conversations
      if (url.pathname === "/api/conversations" && method === "GET") {
        const userId = url.searchParams.get("userId");
        const conversations = await db.getUserConversations(userId);

        return new Response(JSON.stringify(conversations), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // UPDATE CONVERSATION: conversation ko edit karo
      if (url.pathname.match(/^\/api\/conversations\/[^/]+\/update$/) && method === "PUT") {
        const conversationId = url.pathname.split("/")[3];
        const data = await request.json();

        const updates = {};
        if (data.name) updates.name = data.name;
        if (data.image) updates.image = data.image;
        if (data.lastMessageId) updates.last_message_id = data.lastMessageId;
        if (data.lastMessageText) updates.last_message_text = data.lastMessageText;

        await db.updateConversation(conversationId, updates);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // DELETE CONVERSATION: conversation ko delete karo
      if (url.pathname.match(/^\/api\/conversations\/[^/]+\/delete$/) && method === "DELETE") {
        const conversationId = url.pathname.split("/")[3];
        await db.deleteConversation(conversationId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ===== MESSAGES =====

      // SEND MESSAGE: naya message bhejo
      if (url.pathname === "/api/messages/send" && method === "POST") {
        const data = await request.json();
        const messageId = `msg_${Date.now()}`;

        await db.sendMessage(
          messageId,
          data.conversationId,
          data.senderId,
          data.type || "text", // "text", "image", "video", "audio"
          data.content || "",
          data.mediaUrl || null,
          data.thumbnailUrl || null,
          data.parentId || null
        );

        // Update conversation's last message
        await db.updateConversation(data.conversationId, {
          last_message_id: messageId,
          last_message_text: data.content || "",
          last_message_time: new Date().toISOString(),
        });

        return new Response(JSON.stringify({ id: messageId, success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // GET MESSAGES: conversation ke sab messages
      if (url.pathname.match(/^\/api\/messages\/[^/]+$/) && method === "GET") {
        const conversationId = url.pathname.split("/")[3];
        const limit = parseInt(url.searchParams.get("limit")) || 50;
        const offset = parseInt(url.searchParams.get("offset")) || 0;

        const messages = await db.getConversationMessages(conversationId, limit, offset);

        return new Response(JSON.stringify(messages), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // UPDATE MESSAGE: message ko edit karo
      if (url.pathname.match(/^\/api\/messages\/[^/]+\/update$/) && method === "PUT") {
        const messageId = url.pathname.split("/")[3];
        const data = await request.json();

        await db.updateMessage(messageId, data.content);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // DELETE MESSAGE: message ko delete karo
      if (url.pathname.match(/^\/api\/messages\/[^/]+\/delete$/) && method === "DELETE") {
        const messageId = url.pathname.split("/")[3];
        await db.deleteMessage(messageId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // MARK MESSAGE AS READ: message ko read mark karo
      if (url.pathname.match(/^\/api\/messages\/[^/]+\/read$/) && method === "POST") {
        const messageId = url.pathname.split("/")[3];
        const data = await request.json();
        const readId = `read_${Date.now()}`;

        await db.markMessageAsRead(readId, messageId, data.userId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // GET MESSAGE READ STATUS: kaun ne message padha
      if (url.pathname.match(/^\/api\/messages\/[^/]+\/reads$/) && method === "GET") {
        const messageId = url.pathname.split("/")[3];
        const reads = await db.getMessageReadStatus(messageId);

        return new Response(JSON.stringify(reads), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ===== CONVERSATION MEMBERS =====

      // ADD MEMBER: conversation me user ko add karo
      if (url.pathname.match(/^\/api\/conversations\/[^/]+\/members\/add$/) && method === "POST") {
        const conversationId = url.pathname.split("/")[3];
        const data = await request.json();
        const memberId = `member_${Date.now()}`;

        await db.addMember(memberId, conversationId, data.userId, data.role || "member");

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // REMOVE MEMBER: conversation se user ko nikal do
      if (url.pathname.match(/^\/api\/conversations\/[^/]+\/members\/remove$/) && method === "DELETE") {
        const conversationId = url.pathname.split("/")[3];
        const userId = url.searchParams.get("userId");

        await db.removeMember(conversationId, userId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // GET MEMBERS: conversation ke sab members
      if (url.pathname.match(/^\/api\/conversations\/[^/]+\/members$/) && method === "GET") {
        const conversationId = url.pathname.split("/")[3];
        const members = await db.getConversationMembers(conversationId);

        return new Response(JSON.stringify(members), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ===================================================================
      // CALLING SYSTEM - Voice/Video Calls
      // ===================================================================

      // START CALL: naya call start karo
      if (url.pathname === "/api/calls/start" && method === "POST") {
        const data = await request.json();
        const callId = `call_${Date.now()}`;

        await db.startCall(
          callId,
          data.conversationId || null,
          data.callerId,
          data.callType, // "voice" ya "video"
          data.roomId,
          data.sessionId
        );

        // Caller ko participant banao
        await db.addCallParticipant(`part_${Date.now()}`, callId, data.callerId, "caller");

        return new Response(JSON.stringify({ id: callId, success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // GET CALL DETAILS: call ki details
      if (url.pathname.match(/^\/api\/calls\/[^/]+$/) && method === "GET") {
        const callId = url.pathname.split("/")[3];
        const call = await db.getCall(callId);

        if (!call) {
          return new Response(JSON.stringify({ error: "Call not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify(call), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // UPDATE CALL STATUS: call ka status change karo (answered, ended, etc.)
      if (url.pathname.match(/^\/api\/calls\/[^/]+\/update$/) && method === "PUT") {
        const callId = url.pathname.split("/")[3];
        const data = await request.json();

        await db.updateCallStatus(
          callId,
          data.status, // "ringing", "answered", "ended"
          data.answeredAt || null,
          data.endedAt || null,
          data.duration || null
        );

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // END CALL: call ko end karo
      if (url.pathname.match(/^\/api\/calls\/[^/]+\/end$/) && method === "POST") {
        const callId = url.pathname.split("/")[3];
        const data = await request.json();

        const duration = data.duration || 0;
        await db.updateCallStatus(callId, "ended", null, new Date().toISOString(), duration);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ===== CALL PARTICIPANTS =====

      // JOIN CALL: call me user ko add karo
      if (url.pathname.match(/^\/api\/calls\/[^/]+\/participants\/join$/) && method === "POST") {
        const callId = url.pathname.split("/")[3];
        const data = await request.json();
        const participantId = `part_${Date.now()}`;

        await db.addCallParticipant(participantId, callId, data.userId, "participant");

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // LEAVE CALL: call se user ko nikal do
      if (url.pathname.match(/^\/api\/calls\/[^/]+\/participants\/leave$/) && method === "DELETE") {
        const callId = url.pathname.split("/")[3];
        const userId = url.searchParams.get("userId");

        await db.removeCallParticipant(callId, userId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // GET CALL PARTICIPANTS: call ke sab participants
      if (url.pathname.match(/^\/api\/calls\/[^/]+\/participants$/) && method === "GET") {
        const callId = url.pathname.split("/")[3];
        const participants = await db.getCallParticipants(callId);

        return new Response(JSON.stringify(participants), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response("Endpoint Not Found", { status: 404, headers: corsHeaders });
    } catch (err) {
      return new Response("Database Error: " + err.message, { status: 500, headers: corsHeaders });
    }
  },
};

// ===================================================================
// WEBSOCKET HANDLER - Real-time messaging aur P2P signaling
// ===================================================================
async function handleWebSocket(request, env, url) {
  // Extract userId from query params
  const userId = url.searchParams.get("userId");
  
  if (!userId) {
    return new Response("userId required", { status: 400 });
  }

  // Get Durable Object stub for this user
  const id = env.USER_SESSION.idFromName(userId);
  const stub = env.USER_SESSION.get(id);

  // Create WebSocket pair
  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);

  // Send server end to Durable Object to manage the connection
  await stub.handleConnection(server, userId);

  // Return client end to APK
  return new Response(null, { 
    status: 101, 
    webSocket: client 
  });
}
