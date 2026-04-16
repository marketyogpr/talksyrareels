/**
 * # PROJECT: SHORTSTALKSYRA
 * # COMPONENT: Cloudflare Bridge Worker (FULL SYNC)
 * # DATABASE: D1 (9 Tables) | STORAGE: R2 (Media)
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
      // --- 1. USER SYSTEM (Table: users) ---

      // Register User
      if (url.pathname === "/api/user/register" && method === "POST") {
        const u = await request.json();
        const now = new Date().toISOString();
        await env.DB.prepare(
          `INSERT INTO users (userId, username, fullName, email, password, bio, coinBalance, followerCount, followingCount, postCount, isVerified, isPremiumUser, isPrivate, isGhostMode, createdAt) 
           VALUES (?, ?, ?, ?, ?, ?, 50, 0, 0, 0, 0, 0, 0, 0, ?)`
        ).bind(u.userId, u.username, u.fullName, u.email || "", u.password, u.bio || "", now).run();
        return new Response("Registered", { status: 201, headers: corsHeaders });
      }

      // Login User
      if (url.pathname === "/api/user/login" && method === "POST") {
        const f = await request.formData();
        const user = await env.DB.prepare("SELECT * FROM users WHERE username = ? AND password = ?")
          .bind(f.get("username"), f.get("password")).first();
        if (!user) return new Response("Invalid Credentials", { status: 401, headers: corsHeaders });
        return new Response(JSON.stringify(user), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Profile Fetch / Check
      if (url.pathname === "/api/user/check" && method === "GET") {
        const id = url.searchParams.get("userId");
        const user = await env.DB.prepare("SELECT * FROM users WHERE userId = ?").bind(id).first();
        return new Response(JSON.stringify(user), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Update Profile (NAME, BIO, LOCATION, WEBSITE, PICS)
      if (url.pathname === "/api/user/update" && method === "POST") {
        const u = await request.json();
        await env.DB.prepare(
          "UPDATE users SET fullName = ?, bio = ?, location = ?, website = ?, profilePicUrl = ?, coverPicUrl = ?, isPrivate = ?, isGhostMode = ? WHERE userId = ?"
        ).bind(u.fullName, u.bio, u.location, u.website, u.profilePicUrl, u.coverPicUrl, u.isPrivate || 0, u.isGhostMode || 0, u.userId).run();
        return new Response("Updated", { headers: corsHeaders });
      }

      // Search Users
      if (url.pathname === "/api/user/search" && method === "GET") {
        const q = url.searchParams.get("query");
        const { results } = await env.DB.prepare(
          "SELECT userId, username, fullName, profilePicUrl, isVerified FROM users WHERE username LIKE ? OR fullName LIKE ? LIMIT 20"
        ).bind(`%${q}%`, `%${q}%`).all();
        return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // --- 2. POST SYSTEM (Table: posts + R2 Storage) ---

      if (url.pathname === "/api/posts" && method === "POST") {
        const f = await request.formData();
        const media = f.get("media");
        let mediaUrl = "";

        if (media && typeof media !== 'string' && media.size > 0) {
          const fileName = `stalk-${Date.now()}-${media.name || 'file'}`;
          await env.BUCKET.put(fileName, media.stream());
          mediaUrl = `https://pub-d825be7386864d659719039d891d33de.r2.dev/${fileName}`;
        }

        const timestamp = new Date().toISOString();
        await env.DB.prepare(
          "INSERT INTO posts (userId, username, content, mediaUrl, type, mood, timestamp, likeCount, commentCount, repostCount, isVerified) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0)"
        ).bind(f.get("userId"), f.get("username") || "User", f.get("content") || "", mediaUrl, f.get("type") || "post", f.get("mood") || "All", timestamp).run();
        
        await env.DB.prepare("UPDATE users SET postCount = postCount + 1 WHERE userId = ?").bind(f.get("userId")).run();
        return new Response(JSON.stringify({ success: true, url: mediaUrl }), { headers: corsHeaders });
      }

      if (url.pathname === "/api/posts" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM posts ORDER BY id DESC LIMIT 50").all();
        return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // --- 3. SOCIAL SYSTEM (Likes, Follows, Comments) ---

      if (url.pathname === "/api/social/like" && method === "POST") {
        const f = await request.formData();
        await env.DB.prepare("INSERT OR IGNORE INTO likes (userId, username, postId, createdAt) VALUES (?, ?, ?, ?)")
          .bind(f.get("userId"), f.get("username"), f.get("postId"), new Date().toISOString()).run();
        await env.DB.prepare("UPDATE posts SET likeCount = likeCount + 1 WHERE id = ?").bind(f.get("postId")).run();
        return new Response("Liked", { headers: corsHeaders });
      }

      if (url.pathname === "/api/social/follow" && method === "POST") {
        const f = await request.formData();
        await env.DB.prepare("INSERT OR IGNORE INTO follows (followerId, followerUsername, followingId, followingUsername) VALUES (?, ?, ?, ?)")
          .bind(f.get("myId"), f.get("myUsername"), f.get("targetId"), f.get("targetUsername")).run();
        await env.DB.prepare("UPDATE users SET followingCount = followingCount + 1 WHERE userId = ?").bind(f.get("myId")).run();
        await env.DB.prepare("UPDATE users SET followerCount = followerCount + 1 WHERE userId = ?").bind(f.get("targetId")).run();
        return new Response("Followed", { headers: corsHeaders });
      }

      if (url.pathname === "/api/social/comment" && method === "POST") {
        const c = await request.json();
        await env.DB.prepare("INSERT INTO comments (userId, username, postId, text, timestamp) VALUES (?, ?, ?, ?, ?)")
          .bind(c.userId, c.username, c.postId, c.text, c.timestamp).run();
        await env.DB.prepare("UPDATE posts SET commentCount = commentCount + 1 WHERE id = ?").bind(c.postId).run();
        return new Response("Commented", { headers: corsHeaders });
      }

      // --- 4. CHAT SYSTEM ---
      if (url.pathname === "/api/chat/send" && method === "POST") {
        const m = await request.json();
        await env.DB.prepare("INSERT INTO chats (senderId, receiverId, text, timestamp) VALUES (?, ?, ?, ?)")
          .bind(m.senderId, m.receiverId, m.text, new Date().toISOString()).run();
        return new Response("Sent", { headers: corsHeaders });
      }

      return new Response("Endpoint Not Found", { status: 404, headers: corsHeaders });

    } catch (err) {
      return new Response("Database Error: " + err.message, { status: 500, headers: corsHeaders });
    }
  }
};
