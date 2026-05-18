/**
 * REST-focused auth handler for TalkSyra (register / login)
 * - Supports Supabase Email/Password signup & login (REST)
 * - Provides Supabase Google OAuth URL to open on client
 * - Supports manual profile creation with optional profile picture upload to R2
 * - Saves profile record into `users` table using SERVICE ROLE key
 *
 * Exports: `handleAuthRequest(request, env)` — call from Worker routing.
 */

import { createClient } from './supabaseClient.js';

export async function handleAuthRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Routes handled by this module:
  // POST  /auth/register      -> register with email/password + optional profile pic
  // POST  /auth/login         -> login with email/password (returns tokens)
  // GET   /auth/google-url    -> returns Supabase Google OAuth URL (client opens it)
  // POST  /auth/upload       -> upload profile pic only (multipart/form-data)

  try {
    if (path.endsWith('/auth/register') && request.method === 'POST') {
      return await handleRegister(request, env);
    }

    if (path.endsWith('/auth/login') && request.method === 'POST') {
      return await handleLogin(request, env);
    }

    if (path.endsWith('/auth/google-url') && request.method === 'GET') {
      return handleGoogleUrl(request, env);
    }

    if (path.endsWith('/auth/upload') && request.method === 'POST') {
      return await handleProfileUpload(request, env);
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Auth Handler Error:', err);
    const payload = err && err.status ? { error: err.error || err } : { error: err.message || String(err) };
    return new Response(JSON.stringify(payload), { status: err.status || 500, headers: { 'Content-Type': 'application/json' } });
  }
}

async function handleRegister(request, env) {
  // Accepts either JSON or multipart/form-data (for profile picture)
  const contentType = request.headers.get('Content-Type') || '';
  let body = {};
  let profilePicUrl = null;

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    body.email = form.get('email');
    body.password = form.get('password');
    body.username = form.get('username') || form.get('full_name') || '';
    body.full_name = form.get('full_name') || '';
    body.bio = form.get('bio') || '';

    const file = form.get('profile_pic');
    if (file && file.size) {
      const upload = await uploadToR2(file, env);
      profilePicUrl = upload?.url || null;
    }
  } else {
    body = await request.json().catch(() => ({}));
  }

  if (!body.email || !body.password) {
    return new Response(JSON.stringify({ error: 'email and password required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // 1) Sign up via Supabase Auth REST
  const signupRes = await fetch(`${env.SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ email: body.email, password: body.password })
  });

  const signupData = await signupRes.json();
  if (!signupRes.ok) {
    return new Response(JSON.stringify({ error: signupData }), { status: signupRes.status, headers: { 'Content-Type': 'application/json' } });
  }

  // Supabase returns `user` on signup (may require confirmation depending on settings)
  const createdUser = signupData.user || null;

  // 2) If we have a created user and a SERVICE ROLE key, insert profile row into `users` table
  if (createdUser && env.SUPABASE_SERVICE_ROLE_KEY) {
    const profile = {
      id: createdUser.id,
      email: body.email,
      username: body.username || null,
      full_name: body.full_name || null,
      bio: body.bio || null,
      profile_pic: profilePicUrl,
      created_at: new Date().toISOString()
    };

    const resp = await fetch(`${env.SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify([profile])
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.warn('Profile insert failed:', err);
      // don't fail the whole signup — return signup info and a warning
      return new Response(JSON.stringify({ user: createdUser, warning: 'profile insert failed' }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // 3) Return signup response (may contain session if auto-signed-in)
  return new Response(JSON.stringify({ user: createdUser, details: signupData }), { status: 201, headers: { 'Content-Type': 'application/json' } });
}

async function handleLogin(request, env) {
  const body = await request.json().catch(() => ({}));
  const { email, password } = body;
  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'email and password required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Supabase token endpoint expects form data
  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('email', email);
  params.append('password', password);

  const loginRes = await fetch(`${env.SUPABASE_URL}/auth/v1/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`
    },
    body: params.toString()
  });

  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    return new Response(JSON.stringify({ error: loginData }), { status: loginRes.status, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify(loginData), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function handleGoogleUrl(request, env) {
  const url = new URL(request.url);
  const redirect_to = url.searchParams.get('redirect_to') || url.searchParams.get('redirect') || '';

  if (!redirect_to) {
    return new Response(JSON.stringify({ error: 'redirect_to query param required (mobile deep-link or web callback)' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Construct Supabase OAuth authorize URL — client should open this URL
  const oauthUrl = `${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect_to)}`;
  return new Response(JSON.stringify({ url: oauthUrl }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

async function handleProfileUpload(request, env) {
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return new Response(JSON.stringify({ error: 'multipart/form-data required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const form = await request.formData();
  const file = form.get('file') || form.get('profile_pic');
  if (!file) {
    return new Response(JSON.stringify({ error: 'file not found in form-data under `file` or `profile_pic`' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const upload = await uploadToR2(file, env);
  if (!upload) {
    return new Response(JSON.stringify({ error: 'upload failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify(upload), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

async function uploadToR2(file, env) {
  if (!env.MY_R2_BUCKET) {
    throw new Error('R2 bucket binding `MY_R2_BUCKET` not configured');
  }

  const buf = await file.arrayBuffer();
  const ext = (file.name || 'bin').split('.').pop();
  const name = `${Date.now()}-${Math.random().toString(36).slice(2,9)}.${ext}`;
  const key = `profile/${name}`;

  await env.MY_R2_BUCKET.put(key, buf, {
    httpMetadata: { contentType: file.type || 'application/octet-stream' }
  });

  const url = `${env.R2_PUBLIC_DOMAIN.replace(/\/$/, '')}/${key}`;
  return { key, url, size: buf.byteLength };
}

export default { handleAuthRequest };
