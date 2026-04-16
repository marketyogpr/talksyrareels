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
      // --- 1. USER AUTH & PROFILE ---

      // [POST] Register User
      if (url.pathname === "/api/user/register" && method === "POST") {
        const user = await request.json();
        await env.DB.prepare(
          "INSERT INTO users (userId, username, password, fullName, bio, coinBalance, followerCount, followingCount, postCount, isVerified, isPremiumUser, isPrivate, isGhostMode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(user.userId, user.username, user.password, user.fullName, user.bio, 50, 0, 0, 0, 0, 0, 0, 0).run();

        return new Response("User Created", { status: 201, headers: corsHeaders });
      }

      // [POST] Login User
      if (url.pathname === "/api/user/login" && method === "POST") {
        const formData = await request.formData();
        const user = await env.DB.prepare("SELECT * FROM users WHERE username = ? AND password = ?")
          .bind(formData.get("username"), formData.get("password")).first();
        if (!user) return new Response("Invalid Credentials", { status: 401, headers: corsHeaders });
        return new Response(JSON.stringify(user), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // [GET] Check Profile
      if (url.pathname === "/api/user/check" && method === "GET") {
        const userId = url.searchParams.get("userId");
        const user = await env.DB.prepare("SELECT * FROM users WHERE userId = ?").bind(userId).first();
        return new Response(JSON.stringify(user), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // [GET] Search Users
      if (url.pathname === "/api/user/search" && method === "GET") {
        const query = url.searchParams.get("query");
        const { results } = await env.DB.prepare("SELECT userId, username, fullName, profilePicUrl FROM users WHERE username LIKE ? OR fullName LIKE ? LIMIT 20")
          .bind(`%${query}%`, `%${query}%`).all();
        return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // --- 2. POSTS & MEDIA (R2 + D1 Sync) ---

      // [POST] Upload Post/Reel
      if (url.pathname === "/api/posts" && method === "POST") {
        const formData = await request.formData();
        const userId = formData.get("userId");
        const username = formData.get("username") || "User";
        const content = formData.get("content") || "";
        const type = formData.get("type") || "post";
        const mood = formData.get("mood") || "All";
        const mediaFile = formData.get("media");

        let mediaUrl = "";
        if (mediaFile && typeof mediaFile !== 'string' && mediaFile.size > 0) {
          const fileName = `media-${Date.now()}-${mediaFile.name || 'file'}`;
          await env.BUCKET.put(fileName, mediaFile.stream());
          mediaUrl = `https://pub-d825be7386864d659719039d891d33de.r2.dev/${fileName}`;
        }

        const timestamp = new Date().toISOString();

        await env.DB.prepare(
          "INSERT INTO posts (userId, username, content, mediaUrl, type, mood, timestamp, likeCount, commentCount, repostCount, isVerified) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0)"
        ).bind(userId, username, content, mediaUrl, type, mood, timestamp).run();

        // Safe increment of postCount
        try {
          await env.DB.prepare("UPDATE users SET postCount = postCount + 1 WHERE userId = ?").bind(userId).run();
        } catch(e) {}

        return new Response(JSON.stringify({ success: true, url: mediaUrl }), { headers: corsHeaders });
      }

      // [GET] Fetch Feed
      if (url.pathname === "/api/posts" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM posts ORDER BY id DESC LIMIT 50").all();
        return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // --- 3. SOCIAL SYNC (Likes, Follows, Comments) ---

      // [POST] Like
      if (url.pathname === "/api/social/like" && method === "POST") {
        const formData = await request.formData();
        const postId = formData.get("postId");
        const userId = formData.get("userId");
        const username = formData.get("username");

        await env.DB.prepare("INSERT OR IGNORE INTO likes (userId, username, postId) VALUES (?, ?, ?)")
          .bind(userId, username, postId).run();
        await env.DB.prepare("UPDATE posts SET likeCount = likeCount + 1 WHERE id = ?").bind(postId).run();
        return new Response("Liked", { headers: corsHeaders });
      }

      // [POST] Follow
      if (url.pathname === "/api/social/follow" && method === "POST") {
        const formData = await request.formData();
        const myId = formData.get("myId");
        const myUsername = formData.get("myUsername");
        const targetId = formData.get("targetId");
        const targetUsername = formData.get("targetUsername");

        await env.DB.prepare("INSERT OR IGNORE INTO follows (followerId, followerUsername, followingId, followingUsername) VALUES (?, ?, ?, ?)")
          .bind(myId, myUsername, targetId, targetUsername).run();
        
        await env.DB.prepare("UPDATE users SET followingCount = followingCount + 1 WHERE userId = ?").bind(myId).run();
        await env.DB.prepare("UPDATE users SET followerCount = followerCount + 1 WHERE userId = ?").bind(targetId).run();
        return new Response("Followed", { headers: corsHeaders });
      }

      // [POST] Comment
      if (url.pathname === "/api/social/comment" && method === "POST") {
        const c = await request.json();
        await env.DB.prepare("INSERT INTO comments (userId, username, postId, text, timestamp) VALUES (?, ?, ?, ?, ?)")
          .bind(c.userId, c.username, c.postId, c.text, c.timestamp).run();
        await env.DB.prepare("UPDATE posts SET commentCount = commentCount + 1 WHERE id = ?").bind(c.postId).run();
        return new Response("Commented", { headers: corsHeaders });
      }

      return new Response("Endpoint Not Found", { status: 404, headers: corsHeaders });

    } catch (err) {
      return new Response("Worker Error: " + err.message, { status: 500, headers: corsHeaders });
    }
  }
};
