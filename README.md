# TalkSyra Cloudflare Worker

A production-ready serverless backend for TalkSyra, handling real-time communication and secure media uploads.

## Features

✅ **Media Upload Bridge (R2)**
- Secure file uploads without exposing R2 credentials in the APK
- Unique filename generation with timestamp and UUID
- File size validation (max 500MB)
- Metadata preservation
- Returns public URL of uploaded asset

✅ **Real-time Signaling (WebSocket)**
- Persistent WebSocket connections for instant messaging
- User session management
- Message routing between users
- WebRTC signaling support (offer/answer/candidate)
- Typing indicators and status updates
- Online/offline user notifications

## Architecture

```
Flutter APK
    ↓
    ├─→ POST /upload → R2 Media Bucket (Cloudflare)
    │   (MediaService.uploadToR2())
    │
    └─→ GET /ws → WebSocket Handler (Real-time)
        (SocketService.connect())
```

## Setup & Deployment

### Prerequisites
- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account with Workers enabled
- R2 bucket for media storage

### Installation

```bash
# Clone repository
git clone https://github.com/marketyogpr/talksyrareels.git
cd talksyrareels

# Install dependencies
npm install

# Setup Wrangler
wrangler login
```

### Configuration

1. **Create R2 Bucket**
```bash
wrangler r2 bucket create talksyra-media --jurisdiction eu
```

2. **Update `wrangler.toml`** with your domain:
```toml
[[r2_buckets]]
binding = "MY_R2_BUCKET"
bucket_name = "talksyra-media"

[env.production]
vars = { R2_PUBLIC_DOMAIN = "https://media.yourdomain.com" }
```

3. **Create R2 Public URL** (Cloudflare Dashboard):
   - Navigate to R2 → Buckets → talksyra-media
   - Create public URL: `https://media.yourdomain.com`

### Deployment

```bash
# Development
npm run dev

# Staging
npm run deploy:staging

# Production
npm run deploy:production
```

## API Endpoints

### 1. Media Upload (POST /upload)

**Request:**
```bash
curl -X POST https://api.talksyra.com/upload \
  -F "file=@video.mp4"
```

**Response (200):**
```json
{
  "success": true,
  "fileName": "1715418000123-abc1234.mp4",
  "url": "https://media.talksyra.com/1715418000123-abc1234.mp4",
  "size": 52428800,
  "timestamp": 1715418000123
}
```

**Error Response (400):**
```json
{
  "error": "No file provided"
}
```

**Error Response (413):**
```json
{
  "error": "File size exceeds 500MB limit"
}
```

### 2. WebSocket Connection (GET /ws)

**Connection:**
```javascript
const socket = new WebSocket('wss://api.talksyra.com/ws?userId=USER_ID_HERE');

socket.onopen = () => console.log('Connected');
socket.onmessage = (event) => handleMessage(JSON.parse(event.data));
socket.onerror = (error) => console.error('Error:', error);
socket.onclose = () => console.log('Disconnected');
```

#### Message Types

**Chat Message**
```json
{
  "type": "message",
  "targetId": "recipient_user_id",
  "message": "Hello!",
  "timestamp": "2024-05-11T10:30:00Z"
}
```

**Typing Indicator**
```json
{
  "type": "typing",
  "targetId": "recipient_user_id"
}
```

**WebRTC Offer**
```json
{
  "type": "offer",
  "targetId": "recipient_user_id",
  "payload": { "sdp": "v=0\r\no=..." }
}
```

**WebRTC Answer**
```json
{
  "type": "answer",
  "targetId": "recipient_user_id",
  "payload": { "sdp": "v=0\r\no=..." }
}
```

**ICE Candidate**
```json
{
  "type": "candidate",
  "targetId": "recipient_user_id",
  "payload": { "candidate": "candidate:...", "sdpMLineIndex": 0 }
}
```

**Call Request**
```json
{
  "type": "call-request",
  "targetId": "recipient_user_id",
  "payload": { "callType": "voice" }
}
```

**Get Online Users**
```json
{
  "type": "get-users"
}
```

**Response - Users List**
```json
{
  "type": "users-list",
  "users": ["user_2", "user_3", "user_5"]
}
```

#### Incoming Messages (from Server)

**Received Message**
```json
{
  "type": "message",
  "from": "sender_user_id",
  "message": "Hello!",
  "timestamp": "2024-05-11T10:30:00Z"
}
```

**User Status**
```json
{
  "type": "user-status",
  "userId": "user_id",
  "status": "online",
  "timestamp": "2024-05-11T10:30:00Z"
}
```

**Error Message**
```json
{
  "type": "error",
  "message": "Message processing failed",
  "timestamp": "2024-05-11T10:30:00Z"
}
```

## Flutter Integration

### MediaService (Upload)

```dart
import 'package:http/http.dart' as http;

class MediaService {
  static const String UPLOAD_URL = 'https://api.talksyra.com/upload';

  static Future<String> uploadToR2(File file) async {
    try {
      var request = http.MultipartRequest('POST', Uri.parse(UPLOAD_URL));
      request.files.add(await http.MultipartFile.fromPath('file', file.path));
      
      var response = await request.send();
      var responseData = await response.stream.bytesToString();
      
      if (response.statusCode == 200) {
        final json = jsonDecode(responseData);
        return json['url']; // Returns public URL
      } else {
        throw Exception('Upload failed: ${response.statusCode}');
      }
    } catch (e) {
      print('Upload error: $e');
      rethrow;
    }
  }
}
```

### SocketService (WebSocket)

```dart
import 'package:web_socket_channel/web_socket_channel.dart';

class SocketService {
  late WebSocketChannel channel;
  final String userId;
  
  SocketService(this.userId);

  void connect() {
    channel = WebSocketChannel.connect(
      Uri.parse('wss://api.talksyra.com/ws?userId=$userId'),
    );
    
    channel.stream.listen(
      (message) => handleMessage(jsonDecode(message)),
      onError: (error) => print('WebSocket error: $error'),
      onDone: () => print('WebSocket closed'),
    );
  }

  void sendMessage(String targetId, String message) {
    channel.sink.add(jsonEncode({
      'type': 'message',
      'targetId': targetId,
      'message': message,
    }));
  }

  void sendTyping(String targetId) {
    channel.sink.add(jsonEncode({
      'type': 'typing',
      'targetId': targetId,
    }));
  }

  void getOnlineUsers() {
    channel.sink.add(jsonEncode({'type': 'get-users'}));
  }

  void disconnect() {
    channel.sink.close();
  }
}
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MY_R2_BUCKET` | R2 bucket binding (auto-configured) | - |
| `R2_PUBLIC_DOMAIN` | Public URL for R2 | `https://media.talksyra.com` |

## Monitoring & Logging

The worker logs important events:
```
User connected: user_123 (Total: 5)
File uploaded: 1715418000123-abc1234.mp4
Message Processing Error: JSON.parse error
User disconnected: user_123 (Total: 4)
```

View logs:
```bash
wrangler tail --env production
```

## Performance Considerations

- **Max CPU Time**: 50 seconds per request (configurable in `wrangler.toml`)
- **File Size Limit**: 500MB (configurable in `src/index.js`)
- **In-Memory Sessions**: Automatically cleaned up on disconnect
- **WebSocket Keep-Alive**: Managed by Cloudflare (30+ seconds)

## Error Handling

The worker implements comprehensive error handling:

| Status | Error | Handling |
|--------|-------|----------|
| 400 | Missing userId/file | Returns JSON error |
| 413 | File too large | Rejects upload |
| 426 | Not a WebSocket | Returns upgrade error |
| 500 | Server error | Returns error details |

## Security Considerations

✅ **No R2 Credentials Exposed**: Credentials stay on the server
✅ **CORS Ready**: Add headers if needed for browsers
✅ **File Validation**: Size, type, and name checks
✅ **User Isolation**: Session data kept per userId
✅ **Rate Limiting**: Can be added via Cloudflare WAF

## Testing

```bash
# Test media upload
curl -X POST http://localhost:8787/upload -F "file=@test.txt"

# Test WebSocket (using websocat or similar tool)
websocat ws://localhost:8787/ws?userId=test_user
```

## Troubleshooting

### R2 Upload Fails
- Ensure R2 bucket exists: `wrangler r2 bucket list`
- Check bucket binding in `wrangler.toml`
- Verify account has R2 access

### WebSocket Connection Fails
- Verify userId is provided: `?userId=XYZ`
- Check Cloudflare Workers limits
- Review worker logs: `wrangler tail`

### File URL Returns 403
- Create public URL for R2 bucket in Cloudflare Dashboard
- Verify `R2_PUBLIC_DOMAIN` matches the public URL
- Check bucket CORS settings

## License

MIT © TalkSyra

## Support

For issues and feature requests, please visit the [GitHub repository](https://github.com/marketyogpr/talksyrareels/issues).
