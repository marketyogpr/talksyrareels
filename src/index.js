export default {async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
      // --- POST UPLOAD (R2 -> D1 LINK) ---
      if (url.pathname === "/api/posts" && method === "POST") {
        const formData = await request.formData();
        const userId = formData.get("userId");
        const username = formData.get("username") || "User";
        const content = formData.get("content") || "";
        const type = formData.get("type") || "post";
        const mood = formData.get("mood") || "All";
        const mediaFile = formData.get("media");

        let mediaUrl = "";
        // 1. R2 Upload (Aapne kaha ye ho raha hai)
        if (mediaFile && typeof mediaFile !== 'string' && mediaFile.size > 0) {
          const fileName = `media-${Date.now()}-${mediaFile.name || 'file'}`;
          await env.BUCKET.put(fileName, mediaFile.stream());
          mediaUrl = `https://pub-d825be7386864d659719039d891d33de.r2.dev/${fileName}`;
        }

        // 2. D1 Link (Yahan problem ho sakti hai)
        try {
          const timestamp = new Date().toISOString();
          await env.DB.prepare(
            "INSERT INTO posts (userId, username, content, mediaUrl, type, mood, timestamp, likeCount, commentCount, repostCount, isVerified) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0)"
          ).bind(userId, username, content, mediaUrl, type, mood, timestamp).run();
        } catch (dbErr) {
          // Agar database fail ho, to media URL return karein taki debug ho sake
          return new Response("Database Link Failed: " + dbErr.message, { status: 500, headers: corsHeaders });
        }

        return new Response(JSON.stringify({ success: true, url: mediaUrl }), { headers: corsHeaders });
      }

      // --- USER LOGIN/REG/FEED (Schema Match) ---
      if (url.pathname === "/api/user/login" && method === "POST") {
        const formData = await request.formData();
        const user = await env.DB.prepare("SELECT * FROM users WHERE username = ? AND password = ?")
          .bind(formData.get("username"), formData.get("password")).first();
        if (!user) return new Response("Invalid Credentials", { status: 401, headers: corsHeaders });
        return new Response(JSON.stringify(user), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (url.pathname === "/api/posts" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM posts ORDER BY id DESC LIMIT 50").all();
        return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response("Endpoint Not Found", { status: 404, headers: corsHeaders });

    } catch (err) {
      return new Response("Worker Error: " + err.message, { status: 500, headers: corsHeaders });
    }
  }
};
