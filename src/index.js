/**
 * PROJECT: SHORTSTALKSYRA
 * COMPONENT: Cloudflare Worker REST API
 * DATABASE: D1 | STORAGE: R2
 *
 * Ye code apk se aane wale HTTP requests ko handle karta hai.
 * Har section ke upar comment diya gaya hai ki yeh kiska code hai.
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

    const r2PublicUrl = env.R2_PUBLIC_URL ||
      "https://3ff2b455ebd33a9dfc733d1db3afa8f1.r2.cloudflarestorage.com/socialapkvideos";

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

        let profilePicUrl = null;
        if (profilePic && profilePic.size > 0) {
          const fileName = `profiles/${userId}_${Date.now()}.jpg`;
          await env.BUCKET.put(fileName, profilePic.stream());
          profilePicUrl = `${r2PublicUrl}/${fileName}`;
        }

        await env.DB.prepare(
          `INSERT INTO users (userId, username, fullName, email, password, birthDate, profilePicUrl, bio, coinBalance, followerCount, followingCount, postCount, isVerified, isPremiumUser, isPrivate, isGhostMode, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, '', 50, 0, 0, 0, 0, 0, 0, 0, ?)`
        )
          .bind(userId, username, fullName, email, password, birthDate, profilePicUrl, new Date().toISOString())
          .run();

        return new Response("User Registered", { status: 200, headers: corsHeaders });
      }

      // Login User: apk se username/password check karna
      if (url.pathname === "/api/user/login" && method === "POST") {
        const form = await request.formData();
        const user = form.get("username")?.toLowerCase() || "";
        const pass = form.get("password") || "";

        const userData = await env.DB.prepare(
          "SELECT * FROM users WHERE username = ? AND password = ?"
        )
          .bind(user, pass)
          .first();

        if (!userData) {
          return new Response("Invalid Credentials", { status: 401, headers: corsHeaders });
        }

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
          params.push(`${r2PublicUrl}/${fileName}`);
        }

        if (coverPic && coverPic.size > 0) {
          const fileName = `covers/${userId}_c_${Date.now()}.jpg`;
          await env.BUCKET.put(fileName, coverPic.stream());
          updateQuery += ", coverPicUrl = ?";
          params.push(`${r2PublicUrl}/${fileName}`);
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
      // POST SYSTEM - Create post, Fetch posts, R2 media upload
      // ===================================================================

      // Create Post: apk se naya post aur media upload karna
      if (url.pathname === "/api/posts" && method === "POST") {
        const form = await request.formData();
        const media = form.get("media");
        let mediaUrl = "";

        if (media && typeof media !== "string" && media.size > 0) {
          const fileName = `stalk-${Date.now()}-${media.name || "file"}`;
          await env.BUCKET.put(fileName, media.stream());
          mediaUrl = `${r2PublicUrl}/${fileName}`;
        }

        const timestamp = new Date().toISOString();
        await env.DB.prepare(
          "INSERT INTO posts (userId, username, content, mediaUrl, type, mood, timestamp, likeCount, commentCount, repostCount, isVerified) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0)"
        )
          .bind(
            form.get("userId"),
            form.get("username") || "User",
            form.get("content") || "",
            mediaUrl,
            form.get("type") || "post",
            form.get("mood") || "All",
            timestamp
          )
          .run();

        await env.DB.prepare("UPDATE users SET postCount = postCount + 1 WHERE userId = ?")
          .bind(form.get("userId"))
          .run();

        return new Response(JSON.stringify({ success: true, url: mediaUrl }), {
          headers: corsHeaders,
        });
      }

      // Fetch Posts: apk se feed list lana
      if (url.pathname === "/api/posts" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM posts ORDER BY id DESC LIMIT 50").all();
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ===================================================================
      // SOCIAL SYSTEM - Like, Follow, Comment
      // ===================================================================

      // Like Post: apk se post like karna
      if (url.pathname === "/api/social/like" && method === "POST") {
        const form = await request.formData();
        await env.DB.prepare(
          "INSERT OR IGNORE INTO likes (userId, username, postId, createdAt) VALUES (?, ?, ?, ?)"
        )
          .bind(form.get("userId"), form.get("username"), form.get("postId"), new Date().toISOString())
          .run();

        await env.DB.prepare("UPDATE posts SET likeCount = likeCount + 1 WHERE id = ?")
          .bind(form.get("postId"))
          .run();

        return new Response("Liked", { headers: corsHeaders });
      }

      // Follow User: apk se follow action
      if (url.pathname === "/api/social/follow" && method === "POST") {
        const form = await request.formData();
        await env.DB.prepare(
          "INSERT OR IGNORE INTO follows (followerId, followerUsername, followingId, followingUsername) VALUES (?, ?, ?, ?)"
        )
          .bind(form.get("myId"), form.get("myUsername"), form.get("targetId"), form.get("targetUsername"))
          .run();

        await env.DB.prepare("UPDATE users SET followingCount = followingCount + 1 WHERE userId = ?")
          .bind(form.get("myId"))
          .run();

        await env.DB.prepare("UPDATE users SET followerCount = followerCount + 1 WHERE userId = ?")
          .bind(form.get("targetId"))
          .run();

        return new Response("Followed", { headers: corsHeaders });
      }

      // Add Comment: apk se comment submit karna
      if (url.pathname === "/api/social/comment" && method === "POST") {
        const comment = await request.json();
        await env.DB.prepare(
          "INSERT INTO comments (userId, username, postId, text, timestamp) VALUES (?, ?, ?, ?, ?)"
        )
          .bind(comment.userId, comment.username, comment.postId, comment.text, comment.timestamp)
          .run();

        await env.DB.prepare("UPDATE posts SET commentCount = commentCount + 1 WHERE id = ?")
          .bind(comment.postId)
          .run();

        return new Response("Commented", { headers: corsHeaders });
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

      return new Response("Endpoint Not Found", { status: 404, headers: corsHeaders });
    } catch (err) {
      return new Response("Database Error: " + err.message, { status: 500, headers: corsHeaders });
    }
  },
};
