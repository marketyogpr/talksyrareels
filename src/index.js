export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // --- 1. CORS Setup (Zaroori for Android) ---
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
      // --- 2. USER AUTH & PROFILE (Table: users) ---

      // Register
      if (url.pathname === "/api/user/register" && method === "POST") {
        const user = await request.json();
        const now = new Date().toISOString();
        await env.DB.prepare(
          `INSERT INTO users (userId, username, fullName, email, password, bio, coinBalance, followerCount, followingCount, postCount, isVerified, isPremiumUser, isPrivate, isGhostMode, createdAt) 
           VALUES (?, ?, ?, ?, ?, ?, 50, 0, 0, 0, 0, 0, 0, 0, ?)`
        ).bind(user.userId, user.username, user.fullName, user.email || "", user.password, user.bio || "", now).run();
        return new Response("Registered", { status: 201, headers: corsHeaders });
      }

      // Login
      if (url.pathname === "/api/user/login" && method === "POST") {
        const formData = await request.formData();
        const user = await env.DB.prepare("SELECT * FROM users WHERE username = ? AND password = ?")
          .bind(formData.get("username"), formData.get("password")).first();
        if (!user) return new Response("Invalid Credentials", { status: 401, headers: corsHeaders });
        return new Response(JSON.stringify(user), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Update Profile
      if (url.pathname === "/api/user/update" && method === "POST") {
        const u = await request.json();
        await env.DB.prepare(
          "UPDATE users SET fullName = ?, bio = ?, location = ?, website = ?, profilePicUrl = ?, coverPicUrl = ? WHERE userId = ?"
        ).bind(u.fullName, u.bio, u.location, u.website, u.profilePicUrl, u.coverPicUrl, u.userId).run();
        return new Response("Updated", { headers: corsHeaders });
      }

      // Search Users
      if (url.pathname === "/api/user/search" && method === "GET") {
        const q = url.searchParams.get("query");
        const { results } = await env.DB.prepare("SELECT userId, username, fullName, profilePicUrl, isVerified FROM users WHERE username LIKE ? OR fullName LIKE ? LIMIT 20")
          .bind(`%${q}%`, `%${q}%`).all();
        return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // --- 3. POSTS & REELS (Table: posts + R2 Storage) ---

      if (url.pathname === "/api/posts" && method === "POST") {
        const formData = await request.formData();
        const mediaFile = formData.get("media");
        let mediaUrl = "";

        if (mediaFile && typeof mediaFile !== 'string') {
          const fileName = `stalk-${Date.now()}-${mediaFile.name}`;
          await env.BUCKET.put(fileName, mediaFile.stream());
          mediaUrl = `https://pub-d825be7386864d659719039d891d33de.r2.dev/${fileName}`;
        }

        const timestamp = new Date().toISOString();
        await env.DB.prepare(
          "INSERT INTO posts (userId, username, content, mediaUrl, type, mood, timestamp, likeCount, commentCount) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)"
        ).bind(formData.get("userId"), formData.get("username"), formData.get("content"), mediaUrl, formData.get("type"), formData.get("mood"), timestamp).run();
        
        await env.DB.prepare("UPDATE users SET postCount = postCount + 1 WHERE userId = ?").bind(formData.get("userId")).run();
        return new Response(JSON.stringify({ success: true, url: mediaUrl }), { headers: corsHeaders });
      }

      // Feed & Reels
      if (url.pathname === "/api/posts" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM posts ORDER BY id DESC LIMIT 50").all();
        return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // --- 4. SOCIAL SYNC (Tables: likes, follows, comments) ---

      // Like Post
      if (url.pathname === "/api/social/like" && method === "POST") {
        const f = await request.formData();
        await env.DB.prepare("INSERT OR IGNORE INTO likes (userId, username, postId, createdAt) VALUES (?, ?, ?, ?)")
          .bind(f.get("userId"), f.get("username"), f.get("postId"), new Date().toISOString()).run();
        await env.DB.prepare("UPDATE posts SET likeCount = likeCount + 1 WHERE id = ?").bind(f.get("postId")).run();
        return new Response("Liked", { headers: corsHeaders });
      }

      // Comment
      if (url.pathname === "/api/social/comment" && method === "POST") {
        const c = await request.json();
        await env.DB.prepare("INSERT INTO comments (userId, username, postId, text, timestamp) VALUES (?, ?, ?, ?, ?)")
          .bind(c.userId, c.username, c.postId, c.text, c.timestamp).run();
        await env.DB.prepare("UPDATE posts SET commentCount = commentCount + 1 WHERE id = ?").bind(c.postId).run();
        return new Response("Commented", { headers: corsHeaders });
      }

      // Follow
      if (url.pathname === "/api/social/follow" && method === "POST") {
        const f = await request.formData();
        await env.DB.prepare("INSERT OR IGNORE INTO follows (followerId, followerUsername, followingId, followingUsername) VALUES (?, ?, ?, ?)")
          .bind(f.get("myId"), f.get("myUsername"), f.get("targetId"), f.get("targetUsername")).run();
        await env.DB.prepare("UPDATE users SET followingCount = followingCount + 1 WHERE userId = ?").bind(f.get("myId")).run();
        await env.DB.prepare("UPDATE users SET followerCount = followerCount + 1 WHERE userId = ?").bind(f.get("targetId")).run();
        return new Response("Followed", { headers: corsHeaders });
      }

      // --- 5. CHATS (Table: chats) ---
      if (url.pathname === "/api/chat/send" && method === "POST") {
        const msg = await request.json();
        await env.DB.prepare("INSERT INTO chats (senderId, receiverId, text, timestamp) VALUES (?, ?, ?, ?)")
          .bind(msg.senderId, msg.receiverId, msg.text, new Date().toISOString()).run();
        return new Response("Sent", { headers: corsHeaders });
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });

    } catch (err) {
      return new Response("Worker Error: " + err.message, { status: 500, headers: corsHeaders });
    }
  }
};
