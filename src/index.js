async function handleRegister(request, env, corsHeaders) {
  const user = await request.json();
  try {
    await env.DB.prepare(
      "INSERT INTO users (userId, username, password, fullName, bio, coinBalance, isVerified) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(user.userId, user.username, user.password, user.fullName, user.bio, 50, 0).run();

    return new Response("User Created", { status: 201, headers: corsHeaders });
  } catch (e) {
    return new Response("Error: " + e.message, { status: 400, headers: corsHeaders });
  }
}

async function handleLogin(request, env, corsHeaders) {
  const url = new URL(request.url);
  const username = url.searchParams.get("username");
  const password = url.searchParams.get("password");

  const user = await env.DB.prepare(
    "SELECT * FROM users WHERE username = ? AND password = ?"
  ).bind(username, password).first();

  if (user) {
    return new Response(JSON.stringify(user), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } else {
    return new Response("Invalid Username or Password", { status: 401, headers: corsHeaders });
  }
}

async function handleUpdateProfile(request, env, corsHeaders) {
  const user = await request.json();
  await env.DB.prepare(
    "UPDATE users SET fullName = ?, username = ?, bio = ?, location = ?, website = ? WHERE userId = ?"
  ).bind(user.fullName, user.username, user.bio, user.location, user.website, user.userId).run();

  return new Response("Updated", { status: 200, headers: corsHeaders });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // CORS Headers ताकि Android App कनेक्ट हो सके
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
      // --- 1. POST CREATE (With R2 Media Upload) ---
      if (url.pathname === "/api/posts" && method === "POST") {
        const formData = await request.formData();
        const userId = formData.get("userId");
        const content = formData.get("content");
        const type = formData.get("type"); // post, ghost, thread, voice
        const mediaFile = formData.get("media");

        let mediaUrl = "";
        if (mediaFile) {
          const fileName = `media-${Date.now()}-${mediaFile.name}`;
          await env.BUCKET.put(fileName, mediaFile.stream());
          // अपना R2 Public URL यहाँ डालें
          mediaUrl = `https://pub-your-id.r2.dev/${fileName}`;
        }

        await env.DB.prepare(
          "INSERT INTO posts (userId, content, mediaUrl, type) VALUES (?, ?, ?, ?)"
        ).bind(userId, content, mediaUrl, type).run();

        return new Response(JSON.stringify({ success: true, url: mediaUrl }), { headers: corsHeaders });
      }

      // --- USER REGISTRATION ---
      if (url.pathname === "/api/user/register" && method === "POST") {
        return handleRegister(request, env, corsHeaders);
      }

      // --- USER LOGIN ---
      if (url.pathname === "/api/user/login" && method === "GET") {
        return handleLogin(request, env, corsHeaders);
      }

      // --- USER PROFILE UPDATE ---
      if (url.pathname === "/api/user/update" && method === "POST") {
        return handleUpdateProfile(request, env, corsHeaders);
      }

      // --- 2. FETCH FEED (From D1) ---
      if (url.pathname === "/api/posts" && method === "GET") {
        const mood = url.searchParams.get("mood") || "All";
        let query = "SELECT * FROM posts ORDER BY timestamp DESC LIMIT 50";
        const { results } = await env.DB.prepare(query).all();
        return new Response(JSON.stringify(results), { headers: corsHeaders });
      }

      // --- 3. STALK-COINS SYNC ---
      if (url.pathname === "/api/user/coins" && method === "POST") {
        const userId = url.searchParams.get("userId");
        const amount = url.searchParams.get("amount");
        await env.DB.prepare("UPDATE users SET coinBalance = ? WHERE userId = ?")
          .bind(amount, userId).run();
        return new Response("Synced", { headers: corsHeaders });
      }

      // --- 4. CHAT SYSTEM ---
      if (url.pathname === "/api/chat/send" && method === "POST") {
        const data = await request.json();
        await env.DB.prepare("INSERT INTO chats (senderId, receiverId, text) VALUES (?, ?, ?)")
          .bind(data.senderId, data.receiverId, data.text).run();
        return new Response("Sent", { headers: corsHeaders });
      }

      return new Response("Endpoint Not Found", { status: 404, headers: corsHeaders });

    } catch (err) {
      return new Response(err.message, { status: 500, headers: corsHeaders });
    }
  }
};
