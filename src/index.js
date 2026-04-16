/**
 * # PROJECT: SHORTSTALKSYRA * # COMPONENT: Cloudflare Bridge Worker
 * # DESCRIPTION: Full backend logic for D1 (SQL) and R2 (Media Storage).
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // --- 1. CORS HEADERS (Android App connection ke liye zaroori) ---
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
      // --- 2. USER AUTH & PROFILE SYSTEM ---

      // [POST] Register User
      if (url.pathname === "/api/user/register" && method === "POST") {
        const user = await request.json();
        await env.DB.prepare(
          "INSERT INTO users (userId, username, password, fullName, bio, coinBalance, followerCount, followingCount, postCount, isVerified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(user.userId, user.username, user.password, user.fullName, user.bio, 50, 0, 0, 0, 0).run();
        return new Response("User Registered", { status: 201, headers: corsHeaders });
      }

      // [POST] Login User
      if (url.pathname === "/api/user/login" && method === "POST") {
        const formData = await request.formData();
        const user = await env.DB.prepare("SELECT * FROM users WHERE username = ? AND password = ?")
          .bind(formData.get("username"), formData.get("password")).first();
        if (!user) return new Response("Invalid Credentials", { status: 401, headers: corsHeaders });
        return new Response(JSON.stringify(user), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // [GET] Check/Fetch Profile
      if (url.pathname === "/api/user/check" && method === "GET") {
        const userId = url.searchParams.get("userId");
        const user = await env.DB.prepare("SELECT * FROM users WHERE userId = ?").bind(userId).first();
        return new Response(JSON.stringify(user), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // [GET] Search Users (By Username or Name)
      if (url.pathname === "/api/user/search" && method === "GET") {
        const query = url.searchParams.get("query");
        const { results } = await env.DB.prepare(
          "SELECT userId, username, fullName, profilePicUrl, isVerified FROM users WHERE username LIKE ? OR fullName LIKE ? LIMIT 20"
        ).bind(`%${query}%`, `%${query}%`).all();
        return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // [POST] Update Profile
      if (url.pathname === "/api/user/update" && method === "POST") {
        const user = await request.json();
        await env.DB.prepare(
          "UPDATE users SET fullName = ?, bio = ?, location = ?, website = ?, profilePicUrl = ?, coverPicUrl = ? WHERE userId = ?"
        ).bind(user.fullName, user.bio, user.location, user.website, user.profilePicUrl, user.coverPicUrl, user.userId).run();
        return new Response("Profile Updated", { headers: corsHeaders });
      }

      // --- 3. POSTS & REELS (R2 Media + D1) ---

      // [POST] Create Post/Reel
      if (url.pathname === "/api/posts" && method === "POST") {
        const formData = await request.formData();
        const userId = formData.get("userId");
        const username = formData.get("username");
        const content = formData.get("content");
        const type = formData.get("type"); // post, reel, ghost, thread
        const mediaFile = formData.get("media");

        let mediaUrl = "";
        if (mediaFile) {
          const fileName = `media-${Date.now()}-${mediaFile.name}`;
          await env.BUCKET.put(fileName, mediaFile.stream());
          // IMPORTANT: Replace with your actual R2 Public URL
          mediaUrl = `https://pub-your-id.r2.dev/${fileName}`; 
        }

        await env.DB.prepare(
          "INSERT INTO posts (userId, username, content, mediaUrl, type) VALUES (?, ?, ?, ?, ?)"
        ).bind(userId, username, content, mediaUrl, type).run();

        // Increment Post Count in User Table
        await env.DB.prepare("UPDATE users SET postCount = postCount + 1 WHERE userId = ?").bind(userId).run();

        return new Response(JSON.stringify({ success: true, url: mediaUrl }), { headers: corsHeaders });
      }

      // [GET] Fetch Feed
      if (url.pathname === "/api/posts" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM posts ORDER BY timestamp DESC LIMIT 50").all();
        return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // [GET] Fetch Reels Only
      if (url.pathname === "/api/reels" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM posts WHERE type = 'reel' ORDER BY timestamp DESC LIMIT 20").all();
        return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // --- 4. SOCIAL SYNC (Follow, Like, Comment, Repost) ---

      // [POST] Like Post (With Username for Notifications)
      if (url.pathname === "/api/social/like" && method === "POST") {
        const formData = await request.formData();
        const userId = formData.get("userId");
        const username = formData.get("username");
        const postId = formData.get("postId");

        await env.DB.prepare("INSERT OR IGNORE INTO likes (userId, username, postId) VALUES (?, ?, ?)").bind(userId, username, postId).run();
        await env.DB.prepare("UPDATE posts SET likeCount = likeCount + 1 WHERE id = ?").bind(postId).run();
        return new Response("Liked", { headers: corsHeaders });
      }

      // [POST] Follow User
      if (url.pathname === "/api/social/follow" && method === "POST") {
        const formData = await request.formData();
        const myId = formData.get("myId");
        const myUser = formData.get("myUsername");
        const targetId = formData.get("targetId");
        const targetUser = formData.get("targetUsername");

        await env.DB.prepare("INSERT OR IGNORE INTO follows (followerId, followerUsername, followingId, followingUsername) VALUES (?, ?, ?, ?)")
          .bind(myId, myUser, targetId, targetUser).run();
        
        await env.DB.prepare("UPDATE users SET followingCount = followingCount + 1 WHERE userId = ?").bind(myId).run();
        await env.DB.prepare("UPDATE users SET followerCount = followerCount + 1 WHERE userId = ?").bind(targetId).run();
        return new Response("Followed", { headers: corsHeaders });
      }

      // [POST] Add Comment
      if (url.pathname === "/api/social/comment" && method === "POST") {
        const comment = await request.json();
        await env.DB.prepare("INSERT INTO comments (userId, username, postId, text, timestamp) VALUES (?, ?, ?, ?, ?)")
          .bind(comment.userId, comment.username, comment.postId, comment.text, comment.timestamp).run();
        await env.DB.prepare("UPDATE posts SET commentCount = commentCount + 1 WHERE id = ?").bind(comment.postId).run();
        return new Response("Commented", { headers: corsHeaders });
      }

      // [POST] Repost
      if (url.pathname === "/api/social/repost" && method === "POST") {
        const formData = await request.formData();
        const postId = formData.get("postId");
        await env.DB.prepare("UPDATE posts SET repostCount = repostCount + 1 WHERE id = ?").bind(postId).run();
        return new Response("Reposted", { headers: corsHeaders });
      }

      // --- 5. ECONOMY (Coins) ---
      if (url.pathname === "/api/user/coins" && method === "POST") {
        const userId = url.searchParams.get("userId");
        const amount = url.searchParams.get("amount");
        await env.DB.prepare("UPDATE users SET coinBalance = ? WHERE userId = ?").bind(amount, userId).run();
        return new Response("Coins Synced", { headers: corsHeaders });
      }

      return new Response("Endpoint Not Found", { status: 404, headers: corsHeaders });

    } catch (err) {
      return new Response("Server Error: " + err.message, { status: 500, headers: corsHeaders });
    }
  }
};
