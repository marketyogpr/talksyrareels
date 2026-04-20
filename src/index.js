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
