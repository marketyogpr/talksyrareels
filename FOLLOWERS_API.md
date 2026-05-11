# 👥 FOLLOWERS SYSTEM API DOCUMENTATION

**Advanced followers management system with status tracking, mutual detection, and notifications**

---

## 🚀 QUICK START FOR APK

### Import & Setup
```dart
// Flutter APK mein
import 'package:http/http.dart' as http;
import 'dart:convert';

const String API_BASE = "https://your-worker.dev";

class FollowersAPI {
  // Add follower
  Future<void> addFollower(String followerId, String followingId) async {
    var request = http.MultipartRequest(
      'POST',
      Uri.parse('$API_BASE/api/followers/add'),
    );
    
    request.fields['follower_id'] = followerId;
    request.fields['following_id'] = followingId;
    request.fields['status'] = 'accepted';
    request.fields['source'] = 'profile_view';
    
    var response = await request.send();
    var responseData = await response.stream.bytesToString();
    print(jsonDecode(responseData)); // {"success": true, ...}
  }
}
```

---

## 📋 ALL ENDPOINTS

### 1️⃣ ADD FOLLOWER
**Create a new follower relationship**

```
POST /api/followers/add
Content-Type: multipart/form-data

Parameters:
┌─────────────────────┬──────────────┬────────────────────────────┐
│ Parameter           │ Type         │ Description                │
├─────────────────────┼──────────────┼────────────────────────────┤
│ follower_id         │ TEXT*        │ Who is following            │
│ following_id        │ TEXT*        │ Who is being followed       │
│ status              │ TEXT         │ 'accepted' (default) or     │
│                     │              │ 'pending'                  │
│ source              │ TEXT         │ 'search', 'recommendation', │
│                     │              │ 'profile', etc.            │
└─────────────────────┴──────────────┴────────────────────────────┘

✅ Response (Success):
{
  "success": true,
  "message": "Follower added",
  "id": "follower_1704067200000_abc123xyz",
  "isMutual": false
}

❌ Response (Already Following):
{
  "success": false,
  "message": "Follower relationship already exists"
}

🔧 Features:
- Auto-detects mutual following
- Tracks source of follow
- Handles duplicate prevention
```

---

### 2️⃣ REMOVE FOLLOWER
**Delete a follower relationship**

```
POST /api/followers/remove
Content-Type: multipart/form-data

Parameters:
┌─────────────────────┬──────────────┬────────────────────────────┐
│ follower_id         │ TEXT*        │ Who was following           │
│ following_id        │ TEXT*        │ Who was being followed      │
└─────────────────────┴──────────────┴────────────────────────────┘

✅ Response:
{
  "success": true,
  "message": "Follower removed"
}

❌ Response:
{
  "success": false,
  "message": "Follower relationship not found"
}

🔧 Side Effects:
- Decrements user counts (followingCount, followerCount)
- Only if status was 'accepted'
```

---

### 3️⃣ GET FOLLOWERS LIST
**Fetch all followers of a user**

```
GET /api/followers/list/{userId}?limit=50&offset=0&status=accepted

Path Parameters:
┌─────────────────────┬──────────────┬────────────────────────────┐
│ userId              │ TEXT*        │ Whose followers to fetch    │
└─────────────────────┴──────────────┴────────────────────────────┘

Query Parameters:
┌─────────────────────┬──────────────┬────────────────────────────┐
│ limit               │ INTEGER      │ Results per page (def: 50)  │
│ offset              │ INTEGER      │ Pagination offset (def: 0)  │
│ status              │ TEXT         │ 'accepted' (def) or         │
│                     │              │ 'pending'                  │
└─────────────────────┴──────────────┴────────────────────────────┘

✅ Response:
{
  "success": true,
  "followers": [
    {
      "id": "follower_1704067200000_abc123xyz",
      "follower_id": "user123",
      "following_id": "user456",
      "status": "accepted",
      "is_mutual": 1,
      "notifications_enabled": 1,
      "source": "search",
      "created_at": "2024-01-01T10:00:00Z",
      "username": "john_doe",
      "fullName": "John Doe",
      "profilePicUrl": "https://...",
      "isVerified": 1,
      "bio": "Amazing bio"
    },
    ...more followers
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}

📱 APK Usage:
```
// User456 ke sab followers dekhne hain
GET /api/followers/list/user456?limit=30&offset=0&status=accepted
```
```

---

### 4️⃣ GET FOLLOWING LIST
**Fetch all users that someone is following**

```
GET /api/followers/following/{userId}?limit=50&offset=0&status=accepted

Path Parameters:
┌─────────────────────┬──────────────┬────────────────────────────┐
│ userId              │ TEXT*        │ Whose following list        │
└─────────────────────┴──────────────┴────────────────────────────┘

Query Parameters:
┌─────────────────────┬──────────────┬────────────────────────────┐
│ limit               │ INTEGER      │ Results per page (def: 50)  │
│ offset              │ INTEGER      │ Pagination offset (def: 0)  │
│ status              │ TEXT         │ 'accepted' (def) or         │
│                     │              │ 'pending'                  │
└─────────────────────┴──────────────┴────────────────────────────┘

✅ Response:
{
  "success": true,
  "following": [
    {
      "id": "follower_1704067200000_def456uvw",
      "follower_id": "user123",
      "following_id": "user789",
      "status": "accepted",
      "is_mutual": 1,
      "notifications_enabled": 1,
      "source": "recommendation",
      "created_at": "2024-01-02T14:30:00Z",
      "username": "jane_smith",
      "fullName": "Jane Smith",
      "profilePicUrl": "https://...",
      "isVerified": 0,
      "bio": "Travel lover"
    },
    ...more following
  ],
  "total": 75,
  "limit": 50,
  "offset": 0
}

📱 APK Usage:
```
// User123 ko kaun follow kar raha hai
GET /api/followers/following/user123?limit=20&offset=0
```
```

---

### 5️⃣ ACCEPT FOLLOWER REQUEST
**Accept a pending follower request**

```
POST /api/followers/accept
Content-Type: multipart/form-data

Parameters:
┌─────────────────────┬──────────────┬────────────────────────────┐
│ follower_id         │ TEXT*        │ Who sent request            │
│ following_id        │ TEXT*        │ Who receives request        │
└─────────────────────┴──────────────┴────────────────────────────┘

✅ Response:
{
  "success": true,
  "message": "Follower request accepted"
}

❌ Response:
{
  "success": false,
  "message": "Follower request not found"
}

🔧 Side Effects:
- Updates status: 'pending' → 'accepted'
- Increments followingCount (follower_id)
- Increments followerCount (following_id)
```

---

### 6️⃣ REJECT FOLLOWER REQUEST
**Reject a pending follower request**

```
POST /api/followers/reject
Content-Type: multipart/form-data

Parameters:
┌─────────────────────┬──────────────┬────────────────────────────┐
│ follower_id         │ TEXT*        │ Who sent request            │
│ following_id        │ TEXT*        │ Who receives request        │
└─────────────────────┴──────────────┴────────────────────────────┘

✅ Response:
{
  "success": true,
  "message": "Follower request rejected"
}

❌ Response:
{
  "success": false,
  "message": "Follower request not found"
}

🔧 Side Effects:
- Deletes the pending relationship
- No user count updates (status tha pending)
```

---

### 7️⃣ TOGGLE NOTIFICATIONS
**Enable/disable notifications for a follower**

```
POST /api/followers/toggle-notifications
Content-Type: multipart/form-data

Parameters:
┌─────────────────────┬──────────────┬────────────────────────────┐
│ follower_id         │ TEXT*        │ Who is following            │
│ following_id        │ TEXT*        │ Who is being followed       │
│ notifications_enabled│ TEXT*        │ 'true' or 'false'           │
└─────────────────────┴──────────────┴────────────────────────────┘

✅ Response:
{
  "success": true,
  "message": "Notification settings updated",
  "notificationsEnabled": false
}

❌ Response:
{
  "success": false,
  "message": "Follower relationship not found"
}

📝 Example:
```
// User123 ko user456 ke posts ke notifications nahi chahiye
POST /api/followers/toggle-notifications
Form Data:
- follower_id: "user123"
- following_id: "user456"
- notifications_enabled: "false"
```
```

---

### 8️⃣ GET FOLLOWER STATUS
**Check if one user follows another**

```
GET /api/followers/status?follower_id=user123&following_id=user456

Query Parameters:
┌─────────────────────┬──────────────┬────────────────────────────┐
│ follower_id         │ TEXT*        │ Who might be following      │
│ following_id        │ TEXT*        │ Who might be followed       │
└─────────────────────┴──────────────┴────────────────────────────┘

✅ Response (User IS Following):
{
  "success": true,
  "isFollowing": true,
  "status": "accepted",
  "isMutual": true,
  "notificationsEnabled": true
}

✅ Response (User NOT Following):
{
  "success": true,
  "isFollowing": false,
  "status": null
}

📱 APK Usage:
```
// Profile page par check karo ki current user ne follow kiya hai ya nahi
GET /api/followers/status?follower_id=user123&following_id=user456
```

🎨 UI Implementation:
```dart
// Dart code
if (isFollowing) {
  // Show "Following" button with checkmark
  showButton("Following ✓", color: Colors.blue);
} else {
  // Show "Follow" button
  showButton("Follow", color: Colors.green);
}

if (isMutual) {
  // Show "Mutual Followers" badge
  showBadge("Follows You Back 🔄");
}

if (!notificationsEnabled) {
  // Show notification muted icon
  showIcon("🔕 Muted");
}
```
```

---

## 🗄️ DATABASE SCHEMA

```sql
CREATE TABLE IF NOT EXISTS followers (
    id TEXT PRIMARY KEY,
    follower_id TEXT NOT NULL,              -- Who is following
    following_id TEXT NOT NULL,             -- Who is being followed
    status TEXT DEFAULT 'accepted',         -- 'accepted' or 'pending'
    is_mutual INTEGER DEFAULT 0,            -- 1 = both follow each other
    notifications_enabled INTEGER DEFAULT 1, -- 1 = on, 0 = off
    source TEXT,                            -- 'search', 'recommendation', etc
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(userId),
    FOREIGN KEY (following_id) REFERENCES users(userId)
);
```

---

## 🎯 COMMON USE CASES

### 1. User Profile Page - Show Followers Tab
```dart
// Get followers of user456
GET /api/followers/list/user456?limit=50&offset=0

// Show in UI:
// [Profile Picture] John Doe
// [Profile Picture] Jane Smith
// ...
// "Load More" button for pagination
```

### 2. User Profile Page - Show Following Tab
```dart
// Get following list of user123
GET /api/followers/following/user123?limit=50&offset=0

// Same UI structure as followers tab
```

### 3. Profile Header - Follow/Unfollow Button
```dart
// Check if current user follows target user
GET /api/followers/status?follower_id=user123&following_id=user456

if (isFollowing) {
  showButton("Following", onPressed: () {
    POST /api/followers/remove
  });
} else {
  showButton("Follow", onPressed: () {
    POST /api/followers/add
  });
}
```

### 4. Notifications Management
```dart
// User wants to mute notifications from a follower
POST /api/followers/toggle-notifications
Form Data:
- follower_id: "current_user"
- following_id: "user_to_mute"
- notifications_enabled: "false"
```

### 5. Mutual Following Badge
```dart
// Show special badge if mutual
if (isMutual) {
  showBadge("🔄 Follows You Back");
}
```

---

## 📊 COUNT UPDATES

### User Counts Management
```
followingCount  - How many users this person follows
followerCount   - How many users follow this person

Updates Happen When:
✅ POST /api/followers/add (status='accepted') - Both counts +1
❌ POST /api/followers/remove (status='accepted') - Both counts -1
✅ POST /api/followers/accept - Both counts +1
❌ POST /api/followers/reject - No change (was 'pending')
```

---

## ⚠️ ERROR HANDLING

```dart
try {
  var response = await http.post(
    Uri.parse('$API_BASE/api/followers/add'),
    body: {
      'follower_id': followerId,
      'following_id': followingId,
    },
  );

  if (response.statusCode == 400) {
    // Already following or invalid data
    var data = jsonDecode(response.body);
    showError(data['message']); // "Already following"
  } else if (response.statusCode == 404) {
    // User not found
    showError("User not found");
  } else if (response.statusCode == 200) {
    // Success
    var data = jsonDecode(response.body);
    showSuccess("Follower added");
  }
} catch (e) {
  showError("Connection error: ${e.toString()}");
}
```

---

## 📱 FLUTTER APK IMPLEMENTATION EXAMPLE

```dart
class FollowersManager {
  final String apiBase = "https://your-worker.dev";
  
  // Add follower
  Future<bool> followUser(String followerId, String followingId) async {
    try {
      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$apiBase/api/followers/add'),
      );
      
      request.fields['follower_id'] = followerId;
      request.fields['following_id'] = followingId;
      request.fields['status'] = 'accepted';
      request.fields['source'] = 'profile';
      
      var response = await request.send();
      var responseData = await response.stream.bytesToString();
      var data = jsonDecode(responseData);
      
      return data['success'] == true;
    } catch (e) {
      print('Error: $e');
      return false;
    }
  }
  
  // Get follower status
  Future<FollowerStatus?> getFollowerStatus(String followerId, String followingId) async {
    try {
      var response = await http.get(
        Uri.parse('$apiBase/api/followers/status?follower_id=$followerId&following_id=$followingId'),
      );
      
      if (response.statusCode == 200) {
        var data = jsonDecode(response.body);
        return FollowerStatus(
          isFollowing: data['isFollowing'],
          status: data['status'],
          isMutual: data['isMutual'],
          notificationsEnabled: data['notificationsEnabled'],
        );
      }
    } catch (e) {
      print('Error: $e');
    }
    return null;
  }
  
  // Get followers list
  Future<List<FollowerUser>> getFollowers(String userId, {int limit = 50, int offset = 0}) async {
    try {
      var response = await http.get(
        Uri.parse('$apiBase/api/followers/list/$userId?limit=$limit&offset=$offset&status=accepted'),
      );
      
      if (response.statusCode == 200) {
        var data = jsonDecode(response.body);
        return (data['followers'] as List)
            .map((f) => FollowerUser.fromJson(f))
            .toList();
      }
    } catch (e) {
      print('Error: $e');
    }
    return [];
  }
}

class FollowerStatus {
  final bool isFollowing;
  final String? status;
  final bool isMutual;
  final bool notificationsEnabled;
  
  FollowerStatus({
    required this.isFollowing,
    required this.status,
    required this.isMutual,
    required this.notificationsEnabled,
  });
}

class FollowerUser {
  final String userId;
  final String username;
  final String fullName;
  final String? profilePicUrl;
  final bool isVerified;
  final String? bio;
  
  FollowerUser({
    required this.userId,
    required this.username,
    required this.fullName,
    this.profilePicUrl,
    required this.isVerified,
    this.bio,
  });
  
  factory FollowerUser.fromJson(Map<String, dynamic> json) {
    return FollowerUser(
      userId: json['follower_id'],
      username: json['username'],
      fullName: json['fullName'],
      profilePicUrl: json['profilePicUrl'],
      isVerified: json['isVerified'] == 1,
      bio: json['bio'],
    );
  }
}
```

---

## 🔐 SECURITY NOTES

1. **Always validate** follower_id aur following_id APK side par
2. **User authentication** check karo (APK se authorized user hai)
3. **Rate limiting** implement karo duplicate follow attempts prevent karne ke liye
4. **CORS** properly configured है (already done in main endpoint)

---

## 📞 SUPPORT

For issues or questions about the followers API, refer to:
- [Main API Documentation](./GEMINI_SUMMARY.md) - Complete backend docs
- [WebSocket Documentation](./GEMINI_SUMMARY.md#-websocket-real-time-architecture) - Real-time features
