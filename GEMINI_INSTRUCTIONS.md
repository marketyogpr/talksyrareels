# 🤖 GEMINI AI - APK CODE GENERATION GUIDE
## Instructions for Gemini to Generate APK Integration Code

---

## 📌 CONTEXT FOR GEMINI

You are integrating a Social Media Short Video App (ShortsTalkSyra) with a Cloudflare Workers backend. The backend is fully built and ready. Your job is to generate the APK code that communicates with these backend endpoints.

### Backend Base URL:
```
https://talksyrareels.buyviro.workers.dev
(or wherever deployed)
```

### All Endpoints Available:
```
POST /api/user/register
POST /api/user/login
GET /api/user/check
POST /api/user/update
GET /api/user/search

POST /api/posts/create
GET /api/posts/feed
GET /api/posts/user/{userId}
GET /api/posts/detail/{postId}
POST /api/posts/update
POST /api/posts/delete
POST /api/posts/view
POST /api/posts/click

POST /api/social/like
POST /api/social/unlike
POST /api/social/save
POST /api/social/unsave
POST /api/social/comment
GET /api/comments/post/{postId}
POST /api/social/follow
POST /api/social/unfollow
POST /api/social/repost

POST /api/chat/send
```

---

## 🎯 GEMINI TASKS (CODE GENERATION)

### TASK 1: Create Network Service Class
Generate a class/object that handles all HTTP requests to the backend.

**Requirements:**
- Base URL configuration
- Timeout handling
- Error handling
- Request/response logging
- CORS headers included
- Retry logic (optional)

**Methods to Generate:**
```
makeRequest(endpoint, method, data, isMultipart)
→ Makes HTTP request and returns response

registerUser(data)
→ POST /api/user/register

loginUser(username, password)
→ POST /api/user/login

getUserProfile(userId)
→ GET /api/user/check?userId={userId}

updateProfile(userId, data, files)
→ POST /api/user/update

searchUsers(query)
→ GET /api/user/search?query={query}

createPost(userId, username, videoFile, caption, metadata)
→ POST /api/posts/create (multipart)

getFeed(limit, offset)
→ GET /api/posts/feed

getUserPosts(userId)
→ GET /api/posts/user/{userId}

getPostDetail(postId)
→ GET /api/posts/detail/{postId}

updatePost(postId, data)
→ POST /api/posts/update

deletePost(postId, userId)
→ POST /api/posts/delete

likePost(userId, postId)
→ POST /api/social/like

unlikePost(userId, postId)
→ POST /api/social/unlike

savePost(userId, postId)
→ POST /api/social/save

unsavePost(userId, postId)
→ POST /api/social/unsave

addComment(postId, userId, username, userImage, content)
→ POST /api/social/comment

getPostComments(postId)
→ GET /api/comments/post/{postId}

followUser(followerId, followingId)
→ POST /api/social/follow

unfollowUser(followerId, followingId)
→ POST /api/social/unfollow

repostPost(userId, postId, caption)
→ POST /api/social/repost
```

---

### TASK 2: Create Auth/User Management

**Requirements:**
- Store userId locally (SharedPreferences/local storage)
- Store user data locally
- Token handling (if needed)
- Auto-login on app restart
- Logout functionality

**Generate:**
```
class AuthManager {
  loginUser(username, password)
  registerUser(userData)
  logout()
  getCurrentUser()
  isUserLoggedIn()
  saveUserLocally(userData)
  getUserFromLocal()
  updateUserProfile(data)
}
```

---

### TASK 3: Create Post Management

**Requirements:**
- Create post with video upload
- Fetch feed posts
- Display posts with pagination
- Increment view count when post viewed
- Delete own posts
- Track local post creation (while uploading)

**Generate:**
```
class PostManager {
  createPost(videoFile, thumbnailFile, caption, tags, metadata)
  getFeed(limit=50, offset=0)
  getUserPosts(userId)
  getPostDetail(postId)
  deletePost(postId)
  updatePost(postId, newCaption)
  incrementViewCount(postId)
  incrementClickCount(postId)
  refreshFeed()
}
```

---

### TASK 4: Create Social Interactions

**Requirements:**
- Like/Unlike posts
- Save/Unsave posts
- Add comments
- Fetch comments
- Follow/Unfollow users
- Repost posts
- Track local likes/saves

**Generate:**
```
class SocialManager {
  likePost(userId, postId)
  unlikePost(userId, postId)
  savePost(userId, postId)
  unsavePost(userId, postId)
  addComment(postId, userId, username, userImage, content)
  getComments(postId)
  deleteComment(commentId)
  followUser(followerId, followingId)
  unfollowUser(followerId, followingId)
  repostPost(userId, postId, caption)
}
```

---

### TASK 5: Create Local Storage Management

**Requirements:**
- Store user data
- Cache posts (optional)
- Store likes/saves state
- Store user preferences

**Generate:**
```
class StorageManager {
  saveUser(userData)
  getUser()
  clearUser()
  
  savePosts(posts)
  getPosts()
  addPost(post)
  updatePost(postId, postData)
  deletePost(postId)
  clearPosts()
  
  saveLikedPosts(likedPostIds)
  getLikedPosts()
  addLikedPost(postId)
  removeLikedPost(postId)
  
  saveSavedPosts(savedPostIds)
  getSavedPosts()
  addSavedPost(postId)
  removeSavedPost(postId)
}
```

---

### TASK 6: Create UI Components & Views

**Requirements:**
- Feed page (shows all posts)
- Profile page (user info + their posts)
- Create post page (video picker, caption input)
- Post detail page (full post + comments)
- User search page
- Chat/messaging (optional)

**Generate for each:**
- Layout/UI structure
- Data binding
- Event handlers
- State management

---

## 📝 CODE EXAMPLES FOR GEMINI

### Example 1: Create Post

```javascript
// Pseudocode for Gemini to expand

async function createPost(videoFile, thumbnailFile, caption, tags) {
  try {
    // Get current user
    const user = getCurrentUser();
    
    // Create FormData
    const formData = new FormData();
    formData.append("userId", user.userId);
    formData.append("username", user.username);
    formData.append("userImage", user.profilePic);
    formData.append("type", "video");
    formData.append("content", caption);
    formData.append("tags", tags);
    formData.append("visibility", "public");
    formData.append("allowComments", 1);
    formData.append("language", "en");
    formData.append("media", videoFile);
    formData.append("thumbnail", thumbnailFile);
    
    // Send to backend
    const response = await fetch(
      "https://api.example.com/api/posts/create",
      {
        method: "POST",
        body: formData
      }
    );
    
    const result = await response.json();
    
    if (result.success) {
      // Post created!
      // postId = result.postId
      // mediaUrl = result.mediaUrl
      // Add to local feed
      addPostToFeed(result);
      return { success: true, postId: result.postId };
    } else {
      return { success: false, error: result.message };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Example 2: Like Post

```javascript
// Pseudocode for Gemini to expand

async function likePost(postId) {
  try {
    const user = getCurrentUser();
    
    const response = await fetch(
      "https://api.example.com/api/social/like",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          userId: user.userId,
          postId: postId
        }).toString()
      }
    );
    
    const result = await response.json();
    
    if (result.success) {
      // Update UI - like button filled
      // Increment local like count
      updatePostUI(postId, { liked: true, likeCount: oldCount + 1 });
      return true;
    } else if (result.message === "Already liked") {
      // Handle already liked
      return false;
    }
  } catch (error) {
    console.error("Like error:", error);
  }
}
```

### Example 3: Fetch Feed

```javascript
// Pseudocode for Gemini to expand

async function loadFeed(limit = 50, offset = 0) {
  try {
    const response = await fetch(
      `https://api.example.com/api/posts/feed?limit=${limit}&offset=${offset}`
    );
    
    const result = await response.json();
    
    if (result.success) {
      // result.posts = array of post objects
      // Each post has: postId, mediaUrl, likeCount, commentCount, etc.
      
      displayFeedPosts(result.posts);
      return result.posts;
    }
  } catch (error) {
    console.error("Feed error:", error);
  }
}
```

---

## 🔧 TECHNICAL REQUIREMENTS

### For Kotlin/Java (Android)
```kotlin
// Use these libraries:
// - Retrofit2 for HTTP requests
// - OkHttp for multipart uploads
// - Coroutines for async operations
// - Room Database for local storage
// - SharedPreferences for user data
// - Glide/Picasso for image loading

// Key classes to generate:
// - ApiService.kt
// - AuthManager.kt
// - PostManager.kt
// - SocialManager.kt
// - UserRepository.kt
// - PostRepository.kt
// - SharedPrefManager.kt
```

### For Flutter
```dart
// Use these packages:
// - http or dio for requests
// - shared_preferences for storage
// - provider for state management
// - image_picker for file selection
// - video_player for video playback

// Key classes to generate:
// - api_service.dart
// - auth_service.dart
// - post_service.dart
// - social_service.dart
// - storage_service.dart
```

### For React Native
```javascript
// Use these libraries:
// - fetch API or axios for requests
// - AsyncStorage for local storage
// - Redux/Context for state
// - react-native-image-picker
// - react-native-video

// Key modules to generate:
// - apiService.js
// - authService.js
// - postService.js
// - socialService.js
// - storageService.js
```

---

## ✅ TESTING CHECKLIST FOR GEMINI

Generate code that:
- [ ] Registers user successfully
- [ ] Logs in with correct credentials
- [ ] Fails login with wrong credentials
- [ ] Displays feed of 50 posts
- [ ] Creates new post with video
- [ ] Likes post (and prevents duplicate)
- [ ] Unlikes post
- [ ] Saves post
- [ ] Adds comment to post
- [ ] Follows user
- [ ] Searches users
- [ ] Updates profile
- [ ] Handles network errors
- [ ] Handles timeout errors
- [ ] Shows loading indicators
- [ ] Caches data locally
- [ ] Auto-resumes from last session

---

## 🚨 IMPORTANT NOTES FOR GEMINI

1. **Don't hardcode URLs** - Use config/constant file
2. **Always handle errors** - Network, parse, timeout
3. **Always show loading states** - User experience
4. **Cache data locally** - Reduce API calls
5. **Validate inputs** - Before sending to API
6. **Test edge cases** - Empty results, network down
7. **Handle authentication** - Save/restore user session
8. **Optimize image loading** - Compress, cache, lazy load
9. **Optimize video upload** - Show progress, handle pause/resume
10. **Follow platform guidelines** - Android/iOS/Flutter best practices

---

## 📊 DATA STRUCTURES FOR GEMINI

### User Object
```javascript
{
  userId: "user123",
  username: "john_doe",
  fullName: "John Doe",
  email: "john@example.com",
  profilePic: "https://...",
  isVerified: 0,
  bio: "Bio text",
  followerCount: 100,
  followingCount: 50,
  postCount: 25,
  website: "https://...",
  location: "Mumbai"
}
```

### Post Object
```javascript
{
  postId: "user123_1713628800000_abc123",
  userId: "user123",
  username: "john_doe",
  userImage: "https://...",
  type: "video",
  content: "Amazing video! 🔥",
  mediaUrl: "https://buyviro.com/posts/user123/video.mp4",
  thumbnailUrl: "https://...",
  tags: "#viral,#trending",
  likeCount: 150,
  commentCount: 25,
  repostCount: 10,
  viewsCount: 1000,
  saveCount: 5,
  visibility: "public",
  isNsfw: 0,
  allowComments: 1,
  locationName: "Mumbai",
  lat: 19.0760,
  lng: 72.8777,
  timestamp: "2024-01-01T12:30:00Z"
}
```

### Comment Object
```javascript
{
  commentId: "comment_user456_...",
  postId: "user123_1713628800000_abc123",
  userId: "user456",
  username: "commenter_user",
  userImage: "https://...",
  content: "Great post! 👍",
  likeCount: 5,
  timestamp: "2024-01-01T13:00:00Z"
}
```

---

## 🎓 GEMINI INSTRUCTION TEMPLATE

**Use this when asking Gemini to generate code:**

```
I'm building a TikTok-like app called ShortsTalkSyra.

Backend URL: https://talksyrareels.buyviro.workers.dev

Available endpoints:
- POST /api/posts/create (create video post with multipart upload)
- GET /api/posts/feed (get 50 posts with pagination)
- POST /api/social/like (like a post)
- POST /api/social/comment (add comment)
- [etc - list the endpoints you need]

Platform: [Kotlin/Flutter/React Native]

Generate code for:
1. [Specific feature like "create post", "get feed", etc.]
2. Include error handling
3. Include loading states
4. Include local caching
5. Follow [Platform] best practices

Requirements:
- Use [specific library/framework]
- Show progress for file uploads
- Handle timeouts
- Validate inputs
- Return success/error callbacks
```

---

**This document provides everything Gemini needs to generate the complete APK code! ✅**
