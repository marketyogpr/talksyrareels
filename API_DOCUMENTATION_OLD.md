/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          SHORTSTALKSYRA - API ENDPOINTS DOCUMENTATION             ║
 * ║                 APK <-> Backend Communication                     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 * 
 * PROJECT: Shortstalksyra (Social Media App)
 * BACKEND: Cloudflare Workers + D1 Database + R2 Storage
 * PURPOSE: Complete API guide for mobile app integration
 * 
 * ===================================================================
 * SECTION 1: USER ENDPOINTS
 * ===================================================================
 */

// 1️⃣ REGISTER USER - नया user खाता बनाना
POST /api/user/register
Content-Type: multipart/form-data
Parameters:
  - userId (TEXT, REQUIRED) - Unique user ID
  - username (TEXT, REQUIRED) - Username (lowercase, no spaces)
  - fullName (TEXT) - User's full name
  - email (TEXT) - Email address
  - password (TEXT, REQUIRED) - User password
  - birthDate (TEXT) - Date of birth
  - profilePic (FILE) - Profile picture

Response:
  {
    "success": true,
    "message": "User Registered"
  }

// ========================

// 2️⃣ LOGIN USER - User को login करवाना
POST /api/user/login
Content-Type: multipart/form-data
Parameters:
  - username (TEXT) - Username or email
  - password (TEXT) - Password

Response:
  {
    "userId": "user123",
    "username": "john_doe",
    "fullName": "John Doe",
    "email": "john@example.com",
    "profilePic": "https://...",
    "isVerified": 0,
    "followerCount": 100,
    "followingCount": 50,
    ...
  }

// ========================

// 3️⃣ CHECK PROFILE - User की profile details लानी
GET /api/user/check?userId=user123

Response:
  {
    "userId": "user123",
    "username": "john_doe",
    "fullName": "John Doe",
    "profilePic": "https://...",
    ...
  }

// ========================

// 4️⃣ UPDATE PROFILE - User की profile को edit करना
POST /api/user/update
Content-Type: multipart/form-data
Parameters:
  - userId (TEXT, REQUIRED)
  - username (TEXT)
  - fullName (TEXT)
  - bio (TEXT)
  - location (TEXT)
  - website (TEXT)
  - birthDate (TEXT)
  - profilePic (FILE) - नई profile picture
  - coverPic (FILE) - Cover photo

Response:
  {
    "success": true,
    "message": "Profile Updated"
  }

// ========================

// 5️⃣ SEARCH USERS - Username से users खोजना
GET /api/user/search?query=john

Response:
  {
    "success": true,
    "users": [
      {
        "userId": "user123",
        "username": "john_doe",
        "fullName": "John Doe",
        "profilePic": "https://...",
        "isVerified": 1
      }
    ]
  }

/**
 * ===================================================================
 * SECTION 2: POST ENDPOINTS (MAIN - APK TO DB CONNECTION)
 * ===================================================================
 */

// 1️⃣ CREATE POST - नया post बनाना (यह MAIN है!)
POST /api/posts/create
Content-Type: multipart/form-data

Parameters:
  REQUIRED:
    - userId (TEXT) - किस user ने post किया
    - username (TEXT) - Username (for display)
    - type (TEXT) - 'post', 'video', 'story' (auto-detected as 'video' if media uploaded)
    - media (FILE) - Video/Image file

  OPTIONAL:
    - userImage (TEXT) - User की profile pic URL
    - isVerified (INTEGER) - Verified badge (0/1)
    - content (TEXT) - Post caption/text
    - thumbnail (FILE) - Thumbnail image for video
    - metadata (TEXT) - JSON string with extra data
    - tags (TEXT) - Comma-separated hashtags (e.g., "#viral,#trending")
    - language (TEXT) - Language code (default: 'en')
    - visibility (TEXT) - 'public', 'private', 'friends' (default: 'public')
    - allowComments (INTEGER) - Allow comments? 1/0 (default: 1)
    - isNsfw (INTEGER) - Adult content? 0/1 (default: 0)
    - locationName (TEXT) - Location name
    - lat (FLOAT) - Latitude
    - lng (FLOAT) - Longitude
    - aspectRatio (FLOAT) - Video aspect ratio (default: 1.0)
    - duration (FLOAT) - Video duration in seconds
    - adLink (TEXT) - Ad link if promoted
    - isPromoted (INTEGER) - Is promoted? 0/1 (default: 0)
    - coinReward (INTEGER) - Coin reward amount (default: 0)

Response:
  {
    "success": true,
    "postId": "user123_1713628800000_abc123",
    "mediaUrl": "https://buyviro.com/posts/user123/1713628800000_video.mp4",
    "thumbnailUrl": "https://buyviro.com/thumbnails/user123/1713628800000_thumb.jpg",
    "message": "Post created successfully"
  }

// ========================

// 2️⃣ GET FEED POSTS - सभी posts की feed लानी
GET /api/posts/feed?limit=50&offset=0

Parameters:
  - limit (INTEGER) - कितने posts चाहिए (default: 50)
  - offset (INTEGER) - कितने skip करने हैं (pagination)

Response:
  {
    "success": true,
    "posts": [
      {
        "postId": "user123_1713628800000_abc123",
        "userId": "user123",
        "username": "john_doe",
        "userImage": "https://...",
        "type": "video",
        "content": "Check this out! 🔥",
        "mediaUrl": "https://buyviro.com/posts/user123/video.mp4",
        "thumbnailUrl": "https://...",
        "likeCount": 150,
        "commentCount": 25,
        "repostCount": 10,
        "viewsCount": 1000,
        "timestamp": "2024-01-01T12:30:00Z"
        ... (सभी columns)
      }
    ]
  }

// ========================

// 3️⃣ GET USER'S POSTS - किसी user के सभी posts लानी
GET /api/posts/user/{userId}

Example: GET /api/posts/user/user123

Response:
  {
    "success": true,
    "posts": [ ... ]
  }

// ========================

// 4️⃣ GET SINGLE POST - एक specific post की details
GET /api/posts/detail/{postId}

Example: GET /api/posts/detail/user123_1713628800000_abc123

Response:
  {
    "success": true,
    "post": {
      "postId": "...",
      ... (full post data)
    }
  }

// ========================

// 5️⃣ UPDATE POST - Post को edit करना
POST /api/posts/update
Content-Type: multipart/form-data

Parameters:
  - postId (TEXT, REQUIRED) - कौन सा post update करना है
  - content (TEXT) - नया content/caption
  - tags (TEXT) - नए tags
  - metadata (TEXT) - नया metadata
  - visibility (TEXT) - Privacy setting change
  - isNsfw (INTEGER) - NSFW status change

Response:
  {
    "success": true,
    "message": "Post updated successfully"
  }

// ========================

// 6️⃣ DELETE POST - Post को हटाना
POST /api/posts/delete
Content-Type: multipart/form-data

Parameters:
  - postId (TEXT, REQUIRED) - Delete करने वाला post ID
  - userId (TEXT, REQUIRED) - जिसने post किया (verification के लिए)

Response:
  {
    "success": true,
    "message": "Post deleted successfully"
  }

// ========================

// 7️⃣ INCREMENT VIEW COUNT - जब कोई post देखे
POST /api/posts/view
Content-Type: multipart/form-data

Parameters:
  - postId (TEXT, REQUIRED)

Response:
  {
    "success": true,
    "message": "View counted"
  }

// ========================

// 8️⃣ INCREMENT CLICK COUNT - जब कोई link/ad click करे
POST /api/posts/click
Content-Type: multipart/form-data

Parameters:
  - postId (TEXT, REQUIRED)

Response:
  {
    "success": true,
    "message": "Click counted"
  }

/**
 * ===================================================================
 * SECTION 3: SOCIAL INTERACTIONS
 * ===================================================================
 */

// 1️⃣ LIKE POST - Post को like करना
POST /api/social/like
Content-Type: multipart/form-data

Parameters:
  - userId (TEXT, REQUIRED) - किसने like किया
  - postId (TEXT, REQUIRED) - कौन सा post like किया

Response:
  {
    "success": true,
    "message": "Post liked"
  }

// ========================

// 2️⃣ UNLIKE POST - Like को remove करना
POST /api/social/unlike
Content-Type: multipart/form-data

Parameters:
  - userId (TEXT, REQUIRED)
  - postId (TEXT, REQUIRED)

Response:
  {
    "success": true,
    "message": "Like removed"
  }

// ========================

// 3️⃣ SAVE POST - Post को bookmark/save करना
POST /api/social/save
Content-Type: multipart/form-data

Parameters:
  - userId (TEXT, REQUIRED)
  - postId (TEXT, REQUIRED)

Response:
  {
    "success": true,
    "message": "Post saved"
  }

// ========================

// 4️⃣ UNSAVE POST - Saved post को remove करना
POST /api/social/unsave
Content-Type: multipart/form-data

Parameters:
  - userId (TEXT, REQUIRED)
  - postId (TEXT, REQUIRED)

Response:
  {
    "success": true,
    "message": "Post unsaved"
  }

// ========================

// 5️⃣ ADD COMMENT - Comment लिखना
POST /api/social/comment
Content-Type: application/json

Body:
  {
    "postId": "user123_1713628800000_abc123",
    "userId": "user456",
    "username": "commenter_user",
    "userImage": "https://...",
    "content": "Great post! 👍",
    "isNsfw": 0
  }

Response:
  {
    "success": true,
    "commentId": "comment_user456_user123_1713628800000_...",
    "message": "Comment added"
  }

// ========================

// 6️⃣ GET POST COMMENTS - किसी post के सभी comments
GET /api/comments/post/{postId}

Example: GET /api/comments/post/user123_1713628800000_abc123

Response:
  {
    "success": true,
    "comments": [
      {
        "commentId": "...",
        "postId": "...",
        "userId": "user456",
        "username": "commenter_user",
        "content": "Great post! 👍",
        "likeCount": 5,
        "timestamp": "2024-01-01T13:00:00Z"
      }
    ]
  }

// ========================

// 7️⃣ REPOST - Post को share/repost करना
POST /api/social/repost
Content-Type: multipart/form-data

Parameters:
  - userId (TEXT, REQUIRED) - जो repost कर रहा है
  - postId (TEXT, REQUIRED) - Original post की ID
  - caption (TEXT) - अपना caption (optional)

Response:
  {
    "success": true,
    "repostId": "repost_user456_user123_...",
    "message": "Post reposted"
  }

// ========================

// 8️⃣ FOLLOW USER - User को follow करना
POST /api/social/follow
Content-Type: multipart/form-data

Parameters:
  - followerId (TEXT, REQUIRED) - जो follow कर रहा है
  - followingId (TEXT, REQUIRED) - किसको follow कर रहा है

Response:
  {
    "success": true,
    "message": "User followed"
  }

// ========================

// 9️⃣ UNFOLLOW USER - Unfollow करना
POST /api/social/unfollow
Content-Type: multipart/form-data

Parameters:
  - followerId (TEXT, REQUIRED)
  - followingId (TEXT, REQUIRED)

Response:
  {
    "success": true,
    "message": "User unfollowed"
  }

/**
 * ===================================================================
 * SECTION 4: CHAT SYSTEM
 * ===================================================================
 */

// SEND MESSAGE - Message भेजना
POST /api/chat/send
Content-Type: application/json

Body:
  {
    "senderId": "user123",
    "receiverId": "user456",
    "text": "Hello! 👋"
  }

Response:
  {
    "success": true,
    "message": "Message sent"
  }

/**
 * ===================================================================
 * SECTION 5: IMPORTANT NOTES
 * ===================================================================
 * 
 * 📌 ALL REQUESTS तुरंत Database में save हो जाती हैं
 * 📌 Media files (video, images) R2 में upload होती हैं
 * 📌 Unique IDs: postId, commentId, likeId, etc. automatically generate होते हैं
 * 📌 Timestamps: ISO 8601 format में stored होते हैं
 * 📌 CORS enabled है सभी requests के लिए
 * 
 * DATABASE COLUMNS (posts table):
 * ✓ postId - Unique post identifier
 * ✓ userId - Who posted
 * ✓ username - Username display
 * ✓ userImage - Profile picture
 * ✓ isVerified - Verification badge
 * ✓ type - post/reel/story
 * ✓ content - Caption/text
 * ✓ mediaUrl - Video/Image URL (R2)
 * ✓ thumbnailUrl - Preview image
 * ✓ metadata - Extra info (JSON)
 * ✓ tags - Hashtags
 * ✓ language - Content language
 * ✓ likeCount - Number of likes
 * ✓ commentCount - Number of comments
 * ✓ repostCount - Number of reposts
 * ✓ viewsCount - Number of views
 * ✓ saveCount - Number of saves
 * ✓ clickCount - Number of clicks
 * ✓ locationName, lat, lng - Location data
 * ✓ aspectRatio, duration - Media properties
 * ✓ fileSize - File size in bytes
 * ✓ status - active/deleted
 * ✓ isNsfw - Adult content flag
 * ✓ allowComments - Enable/disable comments
 * ✓ visibility - public/private/friends
 * ✓ isPromoted - Promotion status
 * ✓ adLink - Advertisement link
 * ✓ coinReward - Reward amount
 * ✓ timestamp - Created date
 * ✓ updatedAt - Last update date
 */
