# TalkSyra Cloudflare Worker - Deployment Guide

## Complete Setup Instructions

### Step 1: Prerequisites

Ensure you have installed:
- Node.js 18.0.0 or higher
- npm or yarn package manager
- Cloudflare account (free tier works)

### Step 2: Clone and Setup Project

```bash
# Clone repository
git clone https://github.com/marketyogpr/talksyrareels.git
cd talksyrareels

# Install dependencies
npm install

# Authenticate with Cloudflare
wrangler login
```

### Step 3: Create R2 Bucket

```bash
# Create new R2 bucket
wrangler r2 bucket create talksyra-media

# Verify bucket was created
wrangler r2 bucket list
```

### Step 4: Configure Public Domain for R2

**Via Cloudflare Dashboard:**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your account
3. Navigate to **R2 > Buckets > talksyra-media**
4. Click **Settings** tab
5. Under "CORS Rules" (optional), configure as needed
6. In "Public URL" section, click **Create public URL**
7. Choose your domain (e.g., `media.talksyra.com`)
8. Copy the public URL generated

**Update wrangler.toml:**

```toml
[env.production]
vars = { R2_PUBLIC_DOMAIN = "https://media.talksyra.com" }
```

### Step 5: Configure Custom Domain (Optional but Recommended)

1. In **Wrangler Dashboard**, navigate to **Workers & Pages > talksyra-worker**
2. Click **Settings > Domains & Routes**
3. Click **Add Route**
4. Enter: `api.talksyra.com/*`
5. Select your zone (domain)
6. Confirm

Alternative: Update `wrangler.toml`:
```toml
[env.production]
routes = [
  { pattern = "api.talksyra.com/*", zone_name = "talksyra.com" }
]
```

### Step 6: Test Locally

```bash
# Start development server
npm run dev

# Output should show:
# → Listening on http://localhost:8787/

# Test health endpoint (in another terminal)
curl http://localhost:8787/health

# Test file upload
curl -X POST http://localhost:8787/upload -F "file=@test.txt"
```

### Step 7: Deploy to Production

```bash
# Deploy to production environment
npm run deploy:production

# View deployment logs
wrangler tail --env production
```

### Step 8: Verify Deployment

```bash
# Test health endpoint
curl https://api.talksyra.com/health

# Test file upload
curl -X POST https://api.talksyra.com/upload -F "file=@test.txt"

# Test WebSocket connection (requires WebSocket client)
websocat wss://api.talksyra.com/ws?userId=test_user
```

## Staging Environment Setup

For staging/testing before production:

```bash
# Deploy to staging
npm run deploy:staging

# View staging logs
wrangler tail --env staging

# Test staging
curl https://staging-api.talksyra.com/health
```

## Environment Variables

### Production
```env
R2_PUBLIC_DOMAIN=https://media.talksyra.com
```

### Staging
```env
R2_PUBLIC_DOMAIN=https://staging-media.talksyra.com
```

## Troubleshooting Deployment

### Problem: "R2 Bucket not configured"
**Solution:**
```bash
# Verify bucket exists
wrangler r2 bucket list

# Ensure binding in wrangler.toml
[[r2_buckets]]
binding = "MY_R2_BUCKET"
bucket_name = "talksyra-media"
```

### Problem: "Upload returns 403 Forbidden"
**Solution:**
1. Create public URL in R2 settings
2. Verify `R2_PUBLIC_DOMAIN` matches the public URL
3. Wait 5 minutes for DNS propagation

### Problem: "WebSocket connection refused"
**Solution:**
1. Ensure route is configured: `api.talksyra.com/*`
2. Check worker is deployed: `wrangler publish`
3. Verify userId parameter is provided: `?userId=XYZ`

### Problem: "Worker CPU time limit exceeded"
**Solution:**
Adjust in `wrangler.toml`:
```toml
[limits]
cpu_milliseconds = 50000  # Increase if needed (max 30000 for free tier)
```

## Monitoring

### View Real-time Logs
```bash
wrangler tail --env production

# Filter by error
wrangler tail --env production --format pretty | grep -i error
```

### Check Metrics in Dashboard
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages > talksyra-worker**
3. View analytics and error rates

### Common Metrics to Monitor
- Requests per minute
- Error rate
- CPU time usage
- Response times

## Performance Optimization

### 1. Enable caching for static assets
```javascript
// Add to fetch handler
if (url.pathname.endsWith('.txt') || url.pathname.endsWith('.json')) {
  return new Response(response, {
    headers: {
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
```

### 2. Implement request rate limiting
```javascript
// Add rate limiting middleware
const rateLimit = new Map();
```

### 3. Optimize R2 uploads
- Enable compression for text files
- Use multipart uploads for large files
- Implement resumable uploads

## Security Checklist

✅ **Never commit credentials to git:**
```bash
# Add to .gitignore
wrangler.toml.bak
.env
.env.local
```

✅ **Enable authentication for sensitive endpoints:**
```javascript
// Add auth header validation
const token = request.headers.get('Authorization');
if (!token || !token.startsWith('Bearer ')) {
  return new Response('Unauthorized', { status: 401 });
}
```

✅ **Add CORS headers if needed for browser:**
```javascript
return new Response(null, {
  headers: {
    'Access-Control-Allow-Origin': 'https://talksyra.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }
});
```

✅ **Validate file uploads:**
- Check MIME types
- Validate file extensions
- Scan for malware (optional: integrate with ClamAV)

## Cost Estimation

**Free Tier Includes:**
- 100,000 requests/day (300K/month)
- 10ms CPU time per request
- 50 R2 operations/day storage

**Estimated Monthly Costs (1M requests):**
- Workers: Free for first 100K requests, then $0.50 per million
- R2: $0.015 per GB stored + $0.0075 per 10K uploads
- WebSocket: Included in Workers billing

## Rollback Procedure

If you need to rollback a deployment:

```bash
# View deployment history
wrangler deployments list

# Rollback to previous version
wrangler rollback

# Or redeploy previous code
git checkout previous-commit-hash
npm run deploy:production
```

## Getting Help

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [R2 Documentation](https://developers.cloudflare.com/r2/)
- [WebSocket Support](https://developers.cloudflare.com/workers/runtime-apis/web-socket/)

## Contact & Support

For issues specific to TalkSyra:
- GitHub Issues: [talksyrareels/issues](https://github.com/marketyogpr/talksyrareels/issues)
- Email: support@talksyra.com
