# TalkSyra Worker - Quick Start Guide

## 📋 Project Structure

```
talksyrareels/
├── src/
│   └── index.js                 # Main Cloudflare Worker code
├── package.json                 # NPM dependencies
├── wrangler.toml               # Cloudflare Workers config
├── README.md                   # Full documentation
├── DEPLOYMENT.md               # Deployment instructions
├── FLUTTER_INTEGRATION.md      # Flutter service examples
├── TESTING.md                  # Testing guide
└── .gitignore
```

## 🚀 Quick Start (5 minutes)

### 1. Install & Setup
```bash
cd talksyrareels
npm install
wrangler login
```

### 2. Create R2 Bucket
```bash
wrangler r2 bucket create talksyra-media
```

### 3. Test Locally
```bash
npm run dev
# In another terminal:
curl http://localhost:8787/health
```

### 4. Deploy
```bash
npm run deploy:production
```

## 📚 What's Included

### ✅ Core Features
- **Media Upload Endpoint** (`POST /upload`) - Upload files to R2
- **WebSocket Endpoint** (`GET /ws`) - Real-time signaling
- **Message Routing** - Direct user-to-user messaging
- **User Status Tracking** - Online/offline notifications
- **WebRTC Signaling** - SDP offer/answer and ICE candidates

### ✅ Documentation
- Complete API reference with examples
- Flutter integration guide with code samples
- Deployment instructions for production
- Comprehensive testing guide

### ✅ Production Ready
- Error handling & validation
- Proper logging
- Environment configuration (staging/prod)
- Performance optimization

## 🔌 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/upload` | Upload files to R2 |
| `GET` | `/ws?userId=XYZ` | WebSocket connection |
| `GET` | `/health` | Health check |

## 📱 Flutter Integration

### Quick Usage
```dart
// Upload file
String url = await MediaService.uploadToR2(file);

// Connect to real-time messaging
SocketService socketService = SocketService('user_123');
socketService.connect();
socketService.sendMessage('user_456', 'Hello!');
```

See [FLUTTER_INTEGRATION.md](FLUTTER_INTEGRATION.md) for complete examples.

## 🧪 Testing

### Local Testing
```bash
npm run dev

# In another terminal
curl -X POST http://localhost:8787/upload -F "file=@test.txt"
websocat ws://localhost:8787/ws?userId=user_123
```

### Production Testing
```bash
curl https://api.talksyra.com/health
curl -X POST https://api.talksyra.com/upload -F "file=@test.txt"
```

See [TESTING.md](TESTING.md) for detailed test procedures.

## 📖 Full Documentation

- **[README.md](README.md)** - Overview & full API reference
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Step-by-step deployment guide
- **[FLUTTER_INTEGRATION.md](FLUTTER_INTEGRATION.md)** - Flutter service code
- **[TESTING.md](TESTING.md)** - Testing & load testing procedures

## ⚙️ Configuration

### Environment Variables
Update in `wrangler.toml`:

```toml
[env.production]
vars = { R2_PUBLIC_DOMAIN = "https://media.talksyra.com" }

[[r2_buckets]]
binding = "MY_R2_BUCKET"
bucket_name = "talksyra-media"
```

### Custom Domain
Add to `wrangler.toml`:

```toml
[env.production]
routes = [
  { pattern = "api.talksyra.com/*", zone_name = "talksyra.com" }
]
```

## 🔑 Key Features Explained

### 1. Media Upload (R2)
- Securely upload files without exposing R2 credentials in APK
- Automatic filename generation with timestamp
- File size validation (max 500MB)
- Returns public URL

### 2. Real-time WebSocket
- Persistent connections for instant messaging
- User session management
- Message routing based on userId
- Support for chat, typing, and WebRTC signals

### 3. Event Types
```javascript
// Chat message
{ type: "message", targetId: "user_2", message: "Hello!" }

// Typing indicator
{ type: "typing", targetId: "user_2" }

// WebRTC offer/answer
{ type: "offer", targetId: "user_2", payload: { sdp: "..." } }

// ICE candidate
{ type: "candidate", targetId: "user_2", payload: { candidate: "..." } }

// Call request
{ type: "call-request", targetId: "user_2", payload: { callType: "video" } }
```

## 🛠️ Deployment Options

### Staging (for testing)
```bash
npm run deploy:staging
```

### Production
```bash
npm run deploy:production
```

### View Logs
```bash
wrangler tail --env production
```

## 💰 Cost Estimation

**Free Tier (Cloudflare Workers):**
- 100,000 requests/day
- 10ms CPU per request
- No cost!

**If you exceed free tier:**
- $0.50 per million requests
- R2: $0.015/GB stored + $0.0075/10K uploads

## 🔒 Security Notes

✅ Credentials never exposed in APK
✅ CORS can be configured
✅ File validation & size limits
✅ User isolation per userId
✅ Rate limiting can be added via Cloudflare WAF

## ❓ Troubleshooting

### "R2 Bucket not configured"
→ Run: `wrangler r2 bucket list` and verify `wrangler.toml`

### "Upload returns 403"
→ Create public URL in R2 settings and update `R2_PUBLIC_DOMAIN`

### "WebSocket connection refused"
→ Ensure `?userId=XYZ` parameter is provided and route exists

### "Worker CPU time exceeded"
→ Increase `cpu_milliseconds` in `wrangler.toml`

## 📞 Support & Help

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [GitHub Issues](https://github.com/marketyogpr/talksyrareels/issues)

## 📝 Next Steps

1. **Setup**: Follow [DEPLOYMENT.md](DEPLOYMENT.md)
2. **Test**: Follow [TESTING.md](TESTING.md)
3. **Integrate**: Copy code from [FLUTTER_INTEGRATION.md](FLUTTER_INTEGRATION.md)
4. **Deploy**: Run `npm run deploy:production`

---

**Ready to build the next generation of real-time communication!** 🎉
