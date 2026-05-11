# 🧪 FOLLOWERS API - TEST EXAMPLES

Quick test commands using `curl` for all followers endpoints.

---

## 📝 Setup

```bash
# Set your API base URL
API_BASE="https://your-worker.dev"

# Test user IDs
USER1="user123"
USER2="user456"
USER3="user789"
```

---

## ✅ Test Cases

### 1️⃣ Add Follower (User1 follows User2)

```bash
curl -X POST "$API_BASE/api/followers/add" \
  -F "follower_id=$USER1" \
  -F "following_id=$USER2" \
  -F "status=accepted" \
  -F "source=search"

# Expected Response:
# {
#   "success": true,
#   "message": "Follower added",
#   "id": "follower_1704067200000_abc123xyz",
#   "isMutual": false
# }
```

---

### 2️⃣ Check Follower Status

```bash
curl -X GET "$API_BASE/api/followers/status?follower_id=$USER1&following_id=$USER2"

# Expected Response:
# {
#   "success": true,
#   "isFollowing": true,
#   "status": "accepted",
#   "isMutual": false,
#   "notificationsEnabled": true
# }
```

---

### 3️⃣ Get Followers List (User2's followers)

```bash
curl -X GET "$API_BASE/api/followers/list/$USER2?limit=50&offset=0&status=accepted"

# Expected Response:
# {
#   "success": true,
#   "followers": [
#     {
#       "id": "follower_...",
#       "follower_id": "user123",
#       "following_id": "user456",
#       "status": "accepted",
#       "is_mutual": 0,
#       "notifications_enabled": 1,
#       "source": "search",
#       "created_at": "2024-01-01T10:00:00Z",
#       "username": "john_doe",
#       "fullName": "John Doe",
#       "profilePicUrl": "https://...",
#       "isVerified": 1,
#       "bio": "Bio text"
#     }
#   ],
#   "total": 1,
#   "limit": 50,
#   "offset": 0
# }
```

---

### 4️⃣ Get Following List (User1's following)

```bash
curl -X GET "$API_BASE/api/followers/following/$USER1?limit=50&offset=0&status=accepted"

# Expected Response:
# {
#   "success": true,
#   "following": [
#     {
#       "id": "follower_...",
#       "follower_id": "user123",
#       "following_id": "user456",
#       "status": "accepted",
#       "is_mutual": 0,
#       "notifications_enabled": 1,
#       "source": "search",
#       "created_at": "2024-01-01T10:00:00Z",
#       "username": "jane_smith",
#       "fullName": "Jane Smith",
#       "profilePicUrl": "https://...",
#       "isVerified": 0,
#       "bio": "Travel enthusiast"
#     }
#   ],
#   "total": 1,
#   "limit": 50,
#   "offset": 0
# }
```

---

### 5️⃣ Toggle Notifications (Disable)

```bash
curl -X POST "$API_BASE/api/followers/toggle-notifications" \
  -F "follower_id=$USER1" \
  -F "following_id=$USER2" \
  -F "notifications_enabled=false"

# Expected Response:
# {
#   "success": true,
#   "message": "Notification settings updated",
#   "notificationsEnabled": false
# }
```

---

### 6️⃣ Remove Follower (User1 unfollows User2)

```bash
curl -X POST "$API_BASE/api/followers/remove" \
  -F "follower_id=$USER1" \
  -F "following_id=$USER2"

# Expected Response:
# {
#   "success": true,
#   "message": "Follower removed"
# }
```

---

## 🧩 Advanced Test Scenarios

### Scenario 1: Mutual Following

```bash
# User1 follows User2
curl -X POST "$API_BASE/api/followers/add" \
  -F "follower_id=$USER1" \
  -F "following_id=$USER2"

# User2 follows User1 back
curl -X POST "$API_BASE/api/followers/add" \
  -F "follower_id=$USER2" \
  -F "following_id=$USER1"

# Check status - should show isMutual: true
curl -X GET "$API_BASE/api/followers/status?follower_id=$USER1&following_id=$USER2"
# isMutual: 1 ✓
```

---

### Scenario 2: Pagination

```bash
# Get first 10 followers
curl -X GET "$API_BASE/api/followers/list/$USER2?limit=10&offset=0"

# Get next 10
curl -X GET "$API_BASE/api/followers/list/$USER2?limit=10&offset=10"

# Get next 10
curl -X GET "$API_BASE/api/followers/list/$USER2?limit=10&offset=20"
```

---

### Scenario 3: Error Cases

```bash
# Try to follow twice (should fail)
curl -X POST "$API_BASE/api/followers/add" \
  -F "follower_id=$USER1" \
  -F "following_id=$USER2"

# Try again
curl -X POST "$API_BASE/api/followers/add" \
  -F "follower_id=$USER1" \
  -F "following_id=$USER2"

# Response: 400 error
# {
#   "success": false,
#   "message": "Follower relationship already exists"
# }
```

---

## 📱 Flutter APK Testing

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

void main() async {
  final String apiBase = "https://your-worker.dev";
  
  // Test 1: Add follower
  print("Test 1: Adding follower...");
  var request = http.MultipartRequest(
    'POST',
    Uri.parse('$apiBase/api/followers/add'),
  );
  request.fields['follower_id'] = 'user123';
  request.fields['following_id'] = 'user456';
  request.fields['status'] = 'accepted';
  request.fields['source'] = 'search';
  
  var response = await request.send();
  var responseBody = await response.stream.bytesToString();
  var data = jsonDecode(responseBody);
  print("Response: $data");
  
  // Test 2: Get follower status
  print("\nTest 2: Getting follower status...");
  var statusResponse = await http.get(
    Uri.parse('$apiBase/api/followers/status?follower_id=user123&following_id=user456'),
  );
  print("Status: ${statusResponse.body}");
  
  // Test 3: Get followers list
  print("\nTest 3: Getting followers list...");
  var listResponse = await http.get(
    Uri.parse('$apiBase/api/followers/list/user456?limit=50&offset=0'),
  );
  print("Followers: ${listResponse.body}");
}
```

---

## ✨ Success Indicators

✅ All endpoints return 200/201 status codes for success  
✅ Error cases return 400/404 with descriptive messages  
✅ User counts (followingCount, followerCount) are updated correctly  
✅ Mutual following is detected automatically  
✅ Pagination works correctly  
✅ Notifications can be toggled independently  

---

## 🔍 Debugging Tips

1. **Check if follower relationship exists:**
   ```bash
   # Use status endpoint for quick check
   curl "$API_BASE/api/followers/status?follower_id=X&following_id=Y"
   ```

2. **Verify user counts updated:**
   ```bash
   # Check user profile
   curl "$API_BASE/api/user/check?userId=user123"
   # Look for followingCount, followerCount fields
   ```

3. **Test with real user IDs:**
   ```bash
   # Make sure users exist first
   curl "$API_BASE/api/user/check?userId=user123"
   curl "$API_BASE/api/user/check?userId=user456"
   # Both should return user data
   ```

4. **Monitor database:**
   ```sql
   -- Check followers table
   SELECT * FROM followers WHERE follower_id = 'user123';
   
   -- Check user counts
   SELECT userId, followingCount, followerCount FROM users 
   WHERE userId IN ('user123', 'user456');
   ```

---

## 📊 Load Testing

```bash
#!/bin/bash
# Test with multiple followers

for i in {1..100}; do
  USER_ID="user_$i"
  curl -s -X POST "$API_BASE/api/followers/add" \
    -F "follower_id=$USER_ID" \
    -F "following_id=user456" \
    -F "source=test" &
done

wait
echo "Load test complete"
```

---

## 📞 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Already following" error | Use `/followers/remove` first, then re-add |
| Pagination not working | Check limit and offset parameters |
| User counts not updating | Verify status is 'accepted', not 'pending' |
| isMutual always 0 | Need both users to follow each other |
| Notifications toggle not working | Verify relationship exists first |

---

## 🎯 Next Steps

1. ✅ Test all endpoints with real data
2. ✅ Integrate into Flutter APK
3. ✅ Build UI for followers/following pages
4. ✅ Add WebSocket notifications (optional)
5. ✅ Monitor user counts for accuracy
