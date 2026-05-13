# TalkSyra Worker - Media Upload API Response

## 📌 Overview
Cloudflare Worker APK ke files ko R2 bucket mein save karta hai aur **public URLs** return karta hai jisse APK kahi bhi use kar sake.

---

## 🔗 Upload Endpoint
```
POST https://talksyra.buyviro.com/upload
```

### Request Format
```
Content-Type: multipart/form-data

Body:
- file: [video/image file]
```

### Response Format (Success)
```json
{
  "success": true,
  "fileName": "1715588000123-abc123.mp4",
  "url": "https://pub-d825be7386864d659719039d891d33de.r2.dev/1715588000123-abc123.mp4",
  "size": 5242880,
  "timestamp": 1715588000123
}
```

### Response Fields Explanation
| Field | Type | Example | Use Case |
|-------|------|---------|----------|
| `success` | Boolean | `true` | Check if upload passed |
| `fileName` | String | `1715588000123-abc123.mp4` | Unique identifier stored in R2 |
| `url` | String | `https://pub-d825be7386864d659719039d891d33de.r2.dev/...` | **Direct access link** - share/stream video |
| `size` | Number | `5242880` | File size in bytes (for analytics) |
| `timestamp` | Number | `1715588000123` | Upload time (Unix milliseconds) |

---

## 🎬 APK Integration Steps

### Step 1: Upload Video from APK
```
POST /upload
Content-Type: multipart/form-data
file: [selected_video.mp4]
```

### Step 2: Get URL from Response
```json
{
  "url": "https://pub-d825be7386864d659719039d891d33de.r2.dev/1715588000123-abc123.mp4"
}
```

### Step 3: Use URL in APK
- **Save to Database:** Store this URL in your database against the post/video
- **Display:** Use VideoView/Exoplayer to stream from this URL
- **Share:** Send this URL to other users via WebSocket (chat)
- **Analytics:** Use `timestamp` + `size` for analytics

---

## 🤖 Gemini Integration
Send this URL to Gemini for:
- **Video Description:** "Describe this video: {url}"
- **Auto Tagging:** "What are the main topics/tags for: {url}"
- **Content Moderation:** "Is this content appropriate: {url}"
- **Thumbnail Generation:** "Generate caption for: {url}"

---

## ⚠️ Important Details
- **Max File Size:** 500MB
- **Public Access:** Yes - Anyone with URL can access
- **Retention:** Stored permanently in R2
- **Format:** Auto-detects from file extension (mp4, jpg, png, etc.)
- **CDN:** Cloudflare R2 public domain - **Fast delivery globally**

---

## 🔐 Security Notes
- Direct R2 credentials **NOT exposed** to APK
- Worker acts as secure proxy
- File size validated server-side
- Unique names prevent collisions

---

## 📞 Error Responses

### No File Provided
```json
{"error": "No file provided"}
```

### File Too Large
```json
{"error": "File size exceeds 500MB limit"}
```

### R2 Not Configured
```json
{"error": "R2 Bucket not configured"}
```

---

## 💡 Usage Example (APK Code Logic)

```
1. User selects video in APK
2. Upload to: POST https://talksyra.buyviro.com/upload
3. Receive: { url: "https://pub-d825be7386864d659719039d891d33de.r2.dev/..." }
4. Store URL in database
5. Send to Gemini for auto-description
6. Display in APK feed using URL
7. Share URL with other users
```

---

**Ye URL har jagah use ho sakta hai - Database mein, Gemini ke saath, Video player mein, Social share mein!** ✅
