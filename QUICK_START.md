# 🚀 SHORTSTALKSYRA - QUICK START GUIDE FOR APK

## आप का APK यह करेगा ↔️ Backend यह करेगा

---

## 📱 FLOW DIAGRAM

```
USER APP                    CLOUDFLARE WORKER              D1 DATABASE
                           (Middle Man)

Register ───────────────→ /api/user/register ───────→ users table
                                                       
Login ───────────────────→ /api/user/login ──────────→ Verify & Return

Create Post ─────────────→ /api/posts/create ────────→ posts table
(+ upload video/image)      ↓ (R2 Storage)
                             Upload to R2
                             Return URL
                             
Get Feed ───────────────→ /api/posts/feed ──────────→ Query posts table
                                                      Return 50 posts
                                                      
Like Post ──────────────→ /api/social/like ─────────→ likes table
                                                      +1 to likeCount
                                                      
Comment ───────────────→ /api/social/comment ──────→ comments table
                                                      +1 to commentCount

Follow User ────────────→ /api/social/follow ──────→ follows table
                                                      Update counts
```

---

## 🔄 3 TYPES OF REQUESTS YOUR APK SENDS

### 1️⃣ **SIMPLE DATA (GET)**
```
APK: "मुझे सभी posts चाहिए"
Backend: GET /api/posts/feed
Response: JSON array of 50 posts
```

### 2️⃣ **TEXT DATA (POST - JSON)**
```
APK: "मुझे comment submit करना है"
Backend: POST /api/social/comment
Body: { postId, userId, username, content }
Response: { success: true, commentId: "..." }
```

### 3️⃣ **FORM DATA WITH FILES (POST - multipart)**
```
APK: "मुझे नया post बनाना है + video upload करनी है"
Backend: POST /api/posts/create
- video file → uploaded to R2 → URL returned
- metadata → saved to DB
Response: { success: true, postId, mediaUrl }
```

---

## 📌 MAIN ENDPOINTS आपको चाहिए

### **USER ENDPOINTS**
| APK Action | Endpoint | Method | Returns |
|-----------|----------|--------|---------|
| Register करना | `/api/user/register` | POST | success message |
| Login करना | `/api/user/login` | POST | user full data |
| Profile देखना | `/api/user/check?userId=x` | GET | user details |
| Profile edit | `/api/user/update` | POST | success message |
| Search user | `/api/user/search?query=x` | GET | list of users |

### **POST ENDPOINTS** ⭐ (MAIN)
| APK Action | Endpoint | Method | Returns |
|-----------|----------|--------|---------|
| Post बनाना | `/api/posts/create` | POST | postId, mediaUrl |
| Feed देखना | `/api/posts/feed` | GET | array of 50 posts |
| User posts | `/api/posts/user/{userId}` | GET | user के all posts |
| Single post | `/api/posts/detail/{postId}` | GET | post full details |
| Post edit | `/api/posts/update` | POST | success message |
| Post delete | `/api/posts/delete` | POST | success message |
| View count | `/api/posts/view` | POST | view counted |

### **SOCIAL ENDPOINTS**
| APK Action | Endpoint | Method | Returns |
|-----------|----------|--------|---------|
| Like करना | `/api/social/like` | POST | success message |
| Unlike करना | `/api/social/unlike` | POST | success message |
| Save करना | `/api/social/save` | POST | success message |
| Comment | `/api/social/comment` | POST | commentId |
| Comments list | `/api/comments/post/{postId}` | GET | array of comments |
| Follow | `/api/social/follow` | POST | success message |
| Unfollow | `/api/social/unfollow` | POST | success message |
| Repost | `/api/social/repost` | POST | repostId |

---

## 📤 CREATE POST EXAMPLE

```kotlin
// APK में यह code चलेगा:

fun createPost(
    userId: String,
    username: String,
    videoFile: File,
    caption: String,
    tags: String = "#viral"
) {
    val url = "https://api.example.com/api/posts/create"
    val body = MultipartBody.Builder()
        .addFormDataPart("userId", userId)
        .addFormDataPart("username", username)
        .addFormDataPart("type", "reel")
        .addFormDataPart("content", caption)
        .addFormDataPart("tags", tags)
        .addFormDataPart("visibility", "public")
        .addFormDataPart("language", "en")
        .addFormDataPart("media", videoFile.name, 
            RequestBody.create(MediaType.parse("video/mp4"), videoFile))
        .build()
    
    val request = Request.Builder()
        .url(url)
        .post(body)
        .build()
    
    client.newCall(request).enqueue(object : Callback {
        override fun onResponse(call: Call, response: Response) {
            val json = response.body()?.string()
            // {"success": true, "postId": "...", "mediaUrl": "..."}
            // अब यह post हमारे database में है! ✅
        }
    })
}
```

---

## 🗄️ DATABASE TABLES

### **posts** (MAIN TABLE)
```sql
postId (UNIQUE) ← Automatically generated
├── userId
├── username
├── userImage
├── type ('post', 'reel', 'story')
├── content (caption)
├── mediaUrl (R2 link)
├── thumbnailUrl
├── likeCount
├── commentCount
├── repostCount
├── viewsCount
├── saveCount
├── tags (#viral,#trending)
├── visibility ('public', 'private')
└── timestamp
```

### **comments** table
```sql
commentId (UNIQUE)
├── postId
├── userId
├── username
├── content
├── likeCount
└── timestamp
```

### **likes** table
```sql
likeId (UNIQUE)
├── userId
├── postId
└── timestamp
```

### **follows** table
```sql
followerId
├── followingId
└── timestamp
```

---

## 💾 MEDIA UPLOAD FLOW

```
1. APK: Video/Image file भेजता है
         ↓
2. Backend: File को R2 में upload करता है
         ↓
3. R2: File store करता है + URL return करता है
         ↓
4. Database: URL को posts table में save करता है
         ↓
5. APK: postId और mediaUrl receive करता है ✅
```

---

## 🎯 IMPORTANT THINGS TO REMEMBER

✅ **सभी requests तुरंत Database में save हो जाती हैं**
✅ **Media files R2 में जाती हैं**
✅ **Unique IDs खुद बनती हैं (postId, commentId, etc.)**
✅ **Timestamps ISO 8601 format में होते हैं**
✅ **सभी responses JSON में हैं**
✅ **CORS सभी requests के लिए enabled है**
✅ **Profile images, videos सब safely R2 में store होते हैं**

---

## 🔐 ERROR HANDLING

सभी requests में APK को यह check करना चाहिए:

```json
{
  "success": true/false,
  "message": "...",
  "data": {...}
}
```

अगर `success: false` तो error message दिखाओ user को।

---

## 📊 REAL WORLD EXAMPLE: USER CREATING A VIDEO POST

### Step 1: User app में open करता है
```
APK → Check userId from SharedPreferences
```

### Step 2: User video select करता है
```
APK → Video file select करता है (duration, size, thumbnail)
```

### Step 3: User caption लिखता है
```
APK → Text input: "Check this out! 🔥"
Tags input: "#viral #trending"
Location: "Mumbai"
```

### Step 4: POST BUTTON दबाता है
```
APK → POST /api/posts/create
Body:
{
  userId: "user123",
  username: "john_doe",
  userImage: "https://...",
  type: "reel",
  content: "Check this out! 🔥",
  tags: "#viral,#trending",
  locationName: "Mumbai",
  duration: 30,
  visibility: "public",
  allowComments: 1,
  media: <video_file>,
  thumbnail: <thumbnail_image>
}
```

### Step 5: Backend करता है:
```
1. Video को R2 में upload करता है
   → mediaUrl = "https://buyviro.com/posts/user123/1234567890_video.mp4"

2. Thumbnail को R2 में upload करता है
   → thumbnailUrl = "https://buyviro.com/thumbnails/user123/1234567890_thumb.jpg"

3. posts table में entry बनाता है:
   postId = "user123_1234567890_abc123"
   userId = "user123"
   username = "john_doe"
   content = "Check this out! 🔥"
   mediaUrl = "https://..."
   tags = "#viral,#trending"
   likeCount = 0
   timestamp = "2024-01-01T12:30:00Z"
   ... (और सभी fields)

4. users table में postCount += 1 करता है
```

### Step 6: APK को मिलता है:
```json
{
  "success": true,
  "postId": "user123_1234567890_abc123",
  "mediaUrl": "https://buyviro.com/posts/user123/1234567890_video.mp4",
  "thumbnailUrl": "https://buyviro.com/thumbnails/user123/1234567890_thumb.jpg",
  "message": "Post created successfully"
}
```

### Step 7: APK:
```
✅ Show success message
✅ Add post to local list
✅ Update user postCount
✅ Refresh feed
```

---

**सब कुछ समझ गए? अब APK develop करो! 🚀**
