# 📱 TALKSYRA UPLOAD SCRIPT - APK INTEGRATION GUIDE

## 🎯 यह Script क्या है?
यह complete script APK developers के लिए है। इसमें posts, reels और stories upload करने का पूरा code है।

## 📋 Files जो APK में add करने हैं:

### 1. Main Script File: `TalksyraUploadManager.kt`
- Copy-paste करेंगे APK के source code में
- Change करें: `baseUrl = "https://your-actual-api-domain.com"`

### 2. Dependencies (build.gradle):
```gradle
dependencies {
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.12.0'
    implementation 'com.google.code.gson:gson:2.10.1'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
    implementation 'androidx.lifecycle:lifecycle-viewmodel-ktx:2.6.2'
}
```

### 3. Permissions (AndroidManifest.xml):
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

## 🚀 How to Use:

### Regular Post Upload:
```kotlin
val uploadManager = TalksyraUploadManager(baseUrl = "https://your-api.com")

lifecycleScope.launch {
    val result = uploadManager.uploadPost(
        userId = "user123",
        caption = "Hello World!",
        visibility = "public"
    )
}
```

### Reel Upload:
```kotlin
val result = uploadManager.uploadReel(
    userId = "user123",
    videoFile = File("/path/to/video.mp4"),
    caption = "Amazing video!",
    videoDuration = 15.5f,
    videoWidth = 1080,
    videoHeight = 1920
)
```

### Story Upload:
```kotlin
val result = uploadManager.uploadStory(
    userId = "user123",
    videoFile = File("/path/to/story.mp4"),
    videoDuration = 10.0f
)
```

## 📊 API Endpoints Used:
- `POST /api/posts/create` - For all uploads (posts, reels, stories)

## ✅ Features:
- ✅ Progress tracking
- ✅ Error handling
- ✅ File validation
- ✅ Multiple upload types
- ✅ Network timeout handling
- ✅ JSON response parsing

## 🔧 Customization:
- `baseUrl` - अपने API domain से change करें
- `enableLogging` - Development में true, production में false
- Add more validation as needed

---
**🎉 Ready to use! Direct copy-paste in APK project.**