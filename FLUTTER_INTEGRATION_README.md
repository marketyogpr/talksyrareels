# 📱 TALKSYRA FLUTTER UPLOAD SCRIPT - APK INTEGRATION GUIDE

## 🎯 यह Script क्या है?
यह complete Flutter/Dart script आपके APK के लिए है। इसमें posts, reels और stories upload करने का पूरा code है।

## 📋 Files जो Flutter project में add करने हैं:

### 1. Main Script File: `talksyra_upload_manager.dart`
- Copy-paste करेंगे `lib/` folder में
- Change करें: `baseUrl = "https://your-actual-api-domain.com"`

### 2. Dependencies (pubspec.yaml):
```yaml
dependencies:
  flutter:
    sdk: flutter

  # HTTP requests
  http: ^1.1.0

  # File handling & image picker
  image_picker: ^1.0.4

  # MIME type detection
  mime: ^1.0.4

  # HTTP parser for multipart
  http_parser: ^4.0.2

  # For better async handling
  async: ^2.11.0
```

### 3. Permissions:

#### Android (android/app/src/main/AndroidManifest.xml):
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />
```

#### iOS (ios/Runner/Info.plist):
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>Need access to photo library for uploading videos</string>
<key>NSCameraUsageDescription</key>
<string>Need access to camera for recording videos</string>
<key>NSMicrophoneUsageDescription</key>
<string>Need access to microphone for recording videos</string>
```

## 🚀 How to Use:

### Upload Manager Initialize करें:
```dart
final uploadManager = TalksyraUploadManager(
  baseUrl: 'https://your-api-domain.com',
  enableLogging: true,
);
```

### Regular Post Upload:
```dart
try {
  PostResponse response = await uploadManager.uploadPost(
    userId: 'user123',
    caption: 'Hello World!',
    visibility: 'public',
    onProgress: (progress) {
      // UI update करें
      setState(() {
        uploadProgress = progress.progress;
        statusMessage = progress.message;
      });
    },
  );

  // Success
  print('Post uploaded: ${response.postId}');
} catch (e) {
  // Error
  print('Upload failed: $e');
}
```

### Reel Upload:
```dart
try {
  PostResponse response = await uploadManager.uploadReel(
    userId: 'user123',
    videoFile: selectedVideoFile,
    caption: 'Amazing video!',
    visibility: 'public',
    videoWidth: 1080,
    videoHeight: 1920,
    videoDuration: 15.5,
    onProgress: (progress) {
      setState(() {
        uploadProgress = progress.progress;
        statusMessage = progress.message;
      });
    },
  );

  print('Reel uploaded successfully!');
} catch (e) {
  print('Upload failed: $e');
}
```

### Story Upload:
```dart
try {
  PostResponse response = await uploadManager.uploadStory(
    userId: 'user123',
    videoFile: selectedVideoFile,
    caption: 'Quick story!',
    videoWidth: 1080,
    videoHeight: 1920,
    videoDuration: 10.0,
    onProgress: (progress) {
      setState(() {
        uploadProgress = progress.progress;
      });
    },
  );

  print('Story uploaded successfully!');
} catch (e) {
  print('Upload failed: $e');
}
```

## 📊 API Endpoints Used:
- `POST /api/posts/create` - For all uploads (posts, reels, stories)

## ✅ Features:
- ✅ Progress tracking (0-100%)
- ✅ Error handling with proper messages
- ✅ File validation (size, existence check)
- ✅ Network timeout handling
- ✅ JSON response parsing
- ✅ Multipart form data
- ✅ Async/await support

## 🔧 Video Selection Code:

### Gallery से Video चुनने के लिए:
```dart
import 'package:image_picker/image_picker.dart';

final ImagePicker _picker = ImagePicker();

Future<void> _pickVideoFromGallery() async {
  final XFile? video = await _picker.pickVideo(source: ImageSource.gallery);
  if (video != null) {
    setState(() {
      selectedVideoFile = File(video.path);
    });
  }
}

Future<void> _recordVideoFromCamera() async {
  final XFile? video = await _picker.pickVideo(source: ImageSource.camera);
  if (video != null) {
    setState(() {
      selectedVideoFile = File(video.path);
    });
  }
}
```

## 📱 Complete UI Example:

```dart
import 'package:flutter/material.dart';
import 'dart:io';
import 'package:image_picker/image_picker.dart';

class UploadScreen extends StatefulWidget {
  @override
  _UploadScreenState createState() => _UploadScreenState();
}

class _UploadScreenState extends State<UploadScreen> {
  final TalksyraUploadManager _uploadManager = TalksyraUploadManager(
    baseUrl: 'https://your-api-domain.com',
  );

  File? _selectedVideo;
  final TextEditingController _captionController = TextEditingController();
  double _uploadProgress = 0.0;
  String _statusMessage = 'Ready to upload';
  bool _isUploading = false;

  @override
  void dispose() {
    _uploadManager.dispose();
    _captionController.dispose();
    super.dispose();
  }

  Future<void> _pickVideo() async {
    final ImagePicker picker = ImagePicker();
    final XFile? video = await picker.pickVideo(source: ImageSource.gallery);

    if (video != null) {
      setState(() {
        _selectedVideo = File(video.path);
      });
    }
  }

  Future<void> _uploadReel() async {
    if (_selectedVideo == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please select a video')),
      );
      return;
    }

    setState(() {
      _isUploading = true;
      _uploadProgress = 0.0;
    });

    try {
      await _uploadManager.uploadReel(
        userId: 'user123', // Replace with actual user ID
        videoFile: _selectedVideo!,
        caption: _captionController.text,
        videoDuration: 15.5, // Calculate actual duration
        onProgress: (progress) {
          setState(() {
            _uploadProgress = progress.progress / 100.0;
            _statusMessage = progress.message;
          });
        },
      );

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Reel uploaded successfully!')),
      );

    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Upload failed: ${e.toString()}')),
      );
    } finally {
      setState(() => _isUploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Upload Reel'),
      ),
      body: Padding(
        padding: EdgeInsets.all(16.0),
        child: Column(
          children: [
            TextField(
              controller: _captionController,
              decoration: InputDecoration(
                labelText: 'Caption',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
            SizedBox(height: 16),

            ElevatedButton(
              onPressed: _pickVideo,
              child: Text('Select Video'),
            ),

            if (_selectedVideo != null)
              Padding(
                padding: EdgeInsets.symmetric(vertical: 8.0),
                child: Text(
                  'Selected: ${_selectedVideo!.path.split('/').last}',
                  style: TextStyle(color: Colors.green),
                ),
              ),

            SizedBox(height: 16),

            ElevatedButton(
              onPressed: _isUploading ? null : _uploadReel,
              child: Text(_isUploading ? 'Uploading...' : 'Upload Reel'),
            ),

            if (_isUploading) ...[
              SizedBox(height: 16),
              LinearProgressIndicator(value: _uploadProgress),
              SizedBox(height: 8),
              Text(
                '${(_uploadProgress * 100).round()}% - $_statusMessage',
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
```

## 🎯 Important Notes:

1. **Base URL**: अपने actual API domain से replace करें
2. **User ID**: Actual logged-in user का ID use करें
3. **Video Duration**: Video का actual duration calculate करें (video_player package use कर सकते हैं)
4. **Error Handling**: सभी errors properly handle करें
5. **Permissions**: दोनों platforms (Android/iOS) के लिए permissions add करें

---
**🎉 Ready to use! Direct copy-paste in Flutter project.**