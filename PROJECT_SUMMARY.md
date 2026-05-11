# 🎬 SocialApkVideos - Complete Project Summary

**Project Owner:** marketyogpr  
**Repository:** talksyrareels  
**Date Created:** May 11, 2026

---

## 📋 Project Overview

**SocialApkVideos** is a real-time video sharing and communication platform built for Flutter APK. The backend is a Cloudflare Worker that handles two primary responsibilities:

1. **Media Upload** - Upload videos/reels to R2 storage
2. **Real-time Communication** - WebSocket-based messaging and WebRTC signaling

---

## 🏗️ Architecture

```
Flutter APK (Mobile)
    ↓
    ├─→ POST /upload 
    │   ↓
    │   Cloudflare Worker
    │   ↓
    │   R2 Bucket (socialapkvideos-media)
    │   ↓
    │   Public URL returned
    │
    └─→ GET /ws?userId=XYZ
        ↓
        Cloudflare Worker (WebSocket)
        ↓
        Real-time Messaging & WebRTC Signaling
```

---

## 🔐 Cloudflare Configuration

### Worker Details
- **Project Name:** socialapkvideos-worker
- **Production Domain:** https://api.buyviro.com
- **Staging Domain:** https://staging-api.buyviro.com
- **Main File:** src/index.js

### R2 Bucket
- **Bucket Name:** socialapkvideos-media
- **Public URL:** https://pub-d825be7386864d659719039d891d33de.r2.dev
- **Purpose:** Store videos, reels, images

### Configuration File
```
Location: wrangler.toml
- Production routes: api.buyviro.com/*
- Staging routes: staging-api.buyviro.com/*
- R2 binding: MY_R2_BUCKET
- Environment vars configured
```

---

## 📡 API Endpoints

### 1. Health Check
```
GET https://api.buyviro.com/health
Response: { status: "ok", timestamp: "2024-05-11T10:30:00.000Z" }
```

### 2. Media Upload
```
POST https://api.buyviro.com/upload
Content-Type: multipart/form-data

Request:
- file: File object

Response (200):
{
  "success": true,
  "fileName": "1715418000123-abc1234.mp4",
  "url": "https://pub-d825be7386864d659719039d891d33de.r2.dev/1715418000123-abc1234.mp4",
  "size": 52428800,
  "timestamp": 1715418000123
}

Errors:
- 400: No file provided
- 413: File size exceeds 500MB limit
- 500: Upload failed
```

### 3. WebSocket Connection
```
GET wss://api.buyviro.com/ws?userId=USER_ID_HERE

Connection: Upgrade
Required parameter: userId (unique identifier for each user)

Response: 101 Switching Protocols
```

---

## 💬 WebSocket Message Types

### Incoming Messages (Flutter sends)

#### Chat Message
```json
{
  "type": "message",
  "targetId": "recipient_user_id",
  "message": "Hello!"
}
```

#### Typing Indicator
```json
{
  "type": "typing",
  "targetId": "recipient_user_id"
}
```

#### WebRTC Offer
```json
{
  "type": "offer",
  "targetId": "recipient_user_id",
  "payload": { "sdp": "v=0\r\no=..." }
}
```

#### WebRTC Answer
```json
{
  "type": "answer",
  "targetId": "recipient_user_id",
  "payload": { "sdp": "v=0\r\no=..." }
}
```

#### ICE Candidate
```json
{
  "type": "candidate",
  "targetId": "recipient_user_id",
  "payload": { "candidate": "candidate:...", "sdpMLineIndex": 0 }
}
```

#### Call Request
```json
{
  "type": "call-request",
  "targetId": "recipient_user_id",
  "payload": { "callType": "voice" | "video" }
}
```

#### Decline Call
```json
{
  "type": "call-decline",
  "targetId": "recipient_user_id"
}
```

#### End Call
```json
{
  "type": "call-end",
  "targetId": "recipient_user_id"
}
```

#### Get Online Users
```json
{
  "type": "get-users"
}
```

### Incoming Messages (Server sends to Flutter)

#### Received Message
```json
{
  "type": "message",
  "from": "sender_user_id",
  "message": "Hello!",
  "timestamp": "2024-05-11T10:30:00.000Z"
}
```

#### Typing Indicator
```json
{
  "type": "typing",
  "from": "sender_user_id"
}
```

#### User Status Changed
```json
{
  "type": "user-status",
  "userId": "user_id",
  "status": "online" | "offline",
  "timestamp": "2024-05-11T10:30:00.000Z"
}
```

#### Users List
```json
{
  "type": "users-list",
  "users": ["user_2", "user_3", "user_5"]
}
```

#### WebRTC Offer/Answer/Candidate
```json
{
  "type": "offer" | "answer" | "candidate",
  "from": "sender_user_id",
  "payload": { ... }
}
```

#### Incoming Call
```json
{
  "type": "call-request",
  "from": "caller_user_id",
  "callType": "voice" | "video"
}
```

#### Error
```json
{
  "type": "error",
  "message": "Error description",
  "timestamp": "2024-05-11T10:30:00.000Z"
}
```

---

## 🎯 Features Implemented on Backend

✅ **Media Upload Service**
- Unique filename generation (timestamp + random suffix)
- File size validation (max 500MB)
- Metadata preservation
- Public URL generation
- Error handling

✅ **Real-time Messaging**
- User session tracking
- Message routing based on userId
- Broadcast capabilities
- Status updates

✅ **WebRTC Signaling**
- SDP offer/answer exchange
- ICE candidate handling
- Call request/decline/end signals

✅ **User Management**
- Online/offline status tracking
- User list query
- Automatic cleanup on disconnect

✅ **Error Handling**
- Comprehensive validation
- Proper HTTP status codes
- JSON error responses
- Logging

---

## 🛠️ What Needs to be Built in Flutter APK

### 1. MediaService Class
```dart
class MediaService {
  static Future<String> uploadToR2(File file) async {
    // POST to https://api.buyviro.com/upload
    // Return public URL
  }
  
  static Future<String> uploadVideo(File videoFile)
  static Future<String> uploadReel(File reelFile)
  static Future<String> uploadImage(File imageFile)
}
```

### 2. SocketService Class
```dart
class SocketService {
  final String userId;
  late WebSocketChannel channel;
  
  void connect() // Connect to wss://api.buyviro.com/ws?userId=$userId
  void sendMessage(String targetId, String message)
  void sendTyping(String targetId)
  void sendOffer(String targetId, Map offer)
  void sendAnswer(String targetId, Map answer)
  void sendCandidate(String targetId, Map candidate)
  void sendCallRequest(String targetId, String callType)
  void getOnlineUsers()
  void disconnect()
  
  // Callbacks
  Function(String from, String message)? onMessageReceived
  Function(String from)? onTypingReceived
  Function(String from, Map payload)? onWebRTCSignal
  Function(String userId, String status)? onUserStatusChanged
  Function(List<String> users)? onUsersListReceived
}
```

### 3. CommunicationProvider (State Management)
```dart
class CommunicationProvider extends ChangeNotifier {
  List<String> onlineUsers = []
  
  void initializeConnection()
  Future<String> uploadFile(File file)
  void sendMessageToUser(String targetId, String message)
  void notifyTyping(String targetId)
  void requestVideoCall(String targetId)
  void requestAudioCall(String targetId)
}
```

### 4. Features to Implement
- [ ] User Authentication (login/signup)
- [ ] Video Upload with Progress Indicator
- [ ] Reel Recording & Upload
- [ ] Real-time Chat Screen
- [ ] Typing Indicators
- [ ] Online Users List
- [ ] Video Call (Audio + Video)
- [ ] Call Accept/Reject
- [ ] User Profiles
- [ ] Feed (Video List)
- [ ] Comments Section
- [ ] Likes & Shares
- [ ] Direct Messages
- [ ] Stories/Status Updates

---

## 📦 Dependencies for Flutter APK

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # WebSocket
  web_socket_channel: ^2.4.0
  
  # HTTP
  http: ^1.1.0
  
  # State Management
  provider: ^6.0.0
  
  # File Handling
  file_picker: ^5.5.0
  image_picker: ^0.8.8
  video_player: ^2.8.0
  
  # WebRTC (for video calls)
  flutter_webrtc: ^0.9.0
  
  # Local Storage
  shared_preferences: ^2.2.0
  
  # JSON Serialization
  json_annotation: ^4.8.0
  
  # Networking
  connectivity_plus: ^4.0.0

dev_dependencies:
  build_runner: ^2.4.0
  json_serializable: ^6.7.0
```

---

## 🚀 Deployment Status

| Component | Status | Location |
|-----------|--------|----------|
| Worker Code | ✅ Deployed | src/index.js |
| Configuration | ✅ Set | wrangler.toml |
| R2 Bucket | ✅ Created | socialapkvideos-media |
| Public URL | ✅ Active | https://pub-d825be7386864d659719039d891d33de.r2.dev |
| Endpoints | ✅ Live | api.buyviro.com |

---

## 📊 Key Constants for Flutter

```dart
const String API_BASE_URL = 'https://api.buyviro.com';
const String UPLOAD_ENDPOINT = '$API_BASE_URL/upload';
const String WEBSOCKET_URL = 'wss://api.buyviro.com/ws';
const String HEALTH_CHECK = '$API_BASE_URL/health';

const int MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const int FILE_UPLOAD_TIMEOUT = 300000; // 5 minutes
const int WEBSOCKET_RECONNECT_DELAY = 3000; // 3 seconds
```

---

## 🔄 Data Flow Examples

### Example 1: Upload Video & Share
```
1. User picks video file
2. Flutter: MediaService.uploadVideo(file)
3. POST /upload → Cloudflare Worker
4. Worker uploads to R2
5. Returns: https://pub-d825be7386864d659719039d891d33de.r2.dev/VIDEO_ID.mp4
6. Flutter: Save URL to database
7. Display in feed
```

### Example 2: Real-time Chat
```
1. User A connects: ws://api.buyviro.com/ws?userId=user_A
2. User B connects: ws://api.buyviro.com/ws?userId=user_B
3. User A sends: {"type":"message","targetId":"user_B","message":"Hi"}
4. Worker routes message to User B
5. User B receives instantly
6. Both users see message in chat UI
```

### Example 3: Video Call
```
1. User A requests: {"type":"call-request","targetId":"user_B","payload":{"callType":"video"}}
2. User B receives notification
3. User B accepts → sends {"type":"answer",...}
4. Exchange SDP offer/answer via WebSocket
5. Exchange ICE candidates
6. WebRTC connection established
7. Audio/Video streaming begins
```

---

## 🐛 Debugging Tips

### Test Endpoints
```bash
# Health check
curl https://api.buyviro.com/health

# Test upload
curl -X POST https://api.buyviro.com/upload -F "file=@test.mp4"

# Test WebSocket (use websocat or wscat)
wscat -c wss://api.buyviro.com/ws?userId=test_user
```

### View Worker Logs
```bash
wrangler tail --env production
```

### Common Issues & Solutions
- **Upload fails (403)**: R2 public URL not accessible
- **WebSocket not connecting**: Verify userId parameter
- **Messages not routing**: Check targetId matches another connected user
- **CPU timeout**: File too large or processing taking too long

---

## 📚 Documentation Files

All documentation is available in the repository:
- `README.md` - Full API reference
- `DEPLOYMENT.md` - Deployment guide
- `FLUTTER_INTEGRATION.md` - Flutter code examples
- `TESTING.md` - Testing procedures
- `QUICKSTART.md` - Quick start guide

---

## 🎬 Next Steps for APK Development

1. **Setup Flutter Project**
   - Create new Flutter app
   - Add dependencies from above

2. **Implement Services**
   - Copy MediaService code
   - Copy SocketService code
   - Setup CommunicationProvider

3. **Build UI Screens**
   - Login/Auth screen
   - Home feed (video list)
   - Video upload/reel record
   - Chat screen
   - Video call screen
   - User profile

4. **Integration**
   - Connect all screens to services
   - Add error handling
   - Implement state management
   - Add offline support

5. **Testing**
   - Test uploads
   - Test messaging
   - Test calls
   - Performance testing

6. **Release**
   - Build APK
   - Test on devices
   - Publish to Play Store

---

## 💡 Important Notes

✅ **Security:**
- R2 credentials never exposed in APK
- All requests go through verified endpoints
- User isolation via userId

✅ **Performance:**
- Workers handle concurrent connections
- R2 optimized for media storage
- WebSocket efficient for real-time

✅ **Scalability:**
- Cloudflare handles auto-scaling
- No server management needed
- Pay-as-you-go pricing

---

## 📞 Contact & Support

**Repository:** https://github.com/marketyogpr/talksyrareels  
**Budget/Project:** socialapkvideos  
**Domain:** buyviro.com

---

**This summary contains all information needed to continue APK development. Share this with your team/AI assistant for seamless continuation!** 🚀
