/**
 * 📱 TALKSYRA REELS - FLUTTER/DART UPLOAD SCRIPT
 * यह script Flutter APK में directly copy-paste करके use कर सकते हैं
 *
 * Features:
 * ✅ Regular Posts (Text/Image)
 * ✅ Reels (Video Upload)
 * ✅ Stories (Video)
 * ✅ Error Handling
 * ✅ Progress Tracking
 * ✅ File Validation
 */

import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:mime/mime.dart';

// =============================================================================
// 📊 DATA CLASSES FOR API RESPONSES
// =============================================================================

class PostResponse {
  final bool success;
  final String? postId;
  final String? message;
  final String? error;

  PostResponse({
    required this.success,
    this.postId,
    this.message,
    this.error,
  });

  factory PostResponse.fromJson(Map<String, dynamic> json) {
    return PostResponse(
      success: json['success'] ?? false,
      postId: json['postId'],
      message: json['message'],
      error: json['error'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      'postId': postId,
      'message': message,
      'error': error,
    };
  }
}

class UploadProgress {
  final int progress; // 0-100
  final String status; // "uploading", "processing", "completed", "error"
  final String message;

  UploadProgress({
    required this.progress,
    required this.status,
    required this.message,
  });
}

// =============================================================================
// 🎬 TALKSYRA UPLOAD MANAGER - MAIN CLASS
// =============================================================================

class TalksyraUploadManager {
  final String baseUrl;
  final bool enableLogging;
  final http.Client _client;

  TalksyraUploadManager({
    required this.baseUrl,
    this.enableLogging = true,
    http.Client? client,
  }) : _client = client ?? http.Client();

  // =============================================================================
  // 📝 REGULAR POST UPLOAD (TEXT ONLY)
  // =============================================================================

  Future<PostResponse> uploadPost({
    required String userId,
    required String caption,
    String visibility = 'public',
    Function(UploadProgress)? onProgress,
  }) async {
    try {
      onProgress?.call(UploadProgress(
        progress: 10,
        status: 'preparing',
        message: 'Preparing post data...',
      ));

      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/api/posts/create'),
      );

      // Add text fields
      request.fields['user_id'] = userId;
      request.fields['type'] = 'post';
      request.fields['caption'] = caption;
      request.fields['visibility'] = visibility;

      onProgress?.call(UploadProgress(
        progress: 30,
        status: 'uploading',
        message: 'Uploading post...',
      ));

      var response = await request.send();
      var responseBody = await response.stream.bytesToString();

      onProgress?.call(UploadProgress(
        progress: 80,
        status: 'processing',
        message: 'Processing response...',
      ));

      var jsonResponse = json.decode(responseBody);
      var postResponse = PostResponse.fromJson(jsonResponse);

      if (response.statusCode == 200 && postResponse.success) {
        onProgress?.call(UploadProgress(
          progress: 100,
          status: 'completed',
          message: 'Post uploaded successfully!',
        ));
        return postResponse;
      } else {
        var errorMsg = postResponse.error ?? 'Unknown error occurred';
        onProgress?.call(UploadProgress(
          progress: 0,
          status: 'error',
          message: errorMsg,
        ));
        throw Exception(errorMsg);
      }

    } catch (e) {
      onProgress?.call(UploadProgress(
        progress: 0,
        status: 'error',
        message: 'Upload failed: ${e.toString()}',
      ));
      throw e;
    }
  }

  // =============================================================================
  // 🎬 REEL UPLOAD (VIDEO)
  // =============================================================================

  Future<PostResponse> uploadReel({
    required String userId,
    required File videoFile,
    String caption = '',
    String visibility = 'public',
    int videoWidth = 1080,
    int videoHeight = 1920,
    double videoDuration = 0.0,
    Function(UploadProgress)? onProgress,
  }) async {
    try {
      // Validate video file
      if (!await videoFile.exists()) {
        throw Exception('Video file does not exist');
      }

      if (await videoFile.length() == 0) {
        throw Exception('Video file is empty');
      }

      // Check file size (max 100MB for Cloudflare)
      var fileSize = await videoFile.length();
      var maxSize = 100 * 1024 * 1024; // 100MB
      if (fileSize > maxSize) {
        throw Exception('Video file too large. Max size: 100MB');
      }

      onProgress?.call(UploadProgress(
        progress: 5,
        status: 'validating',
        message: 'Validating video file...',
      ));

      // Determine MIME type
      var mimeType = lookupMimeType(videoFile.path) ?? 'video/mp4';

      onProgress?.call(UploadProgress(
        progress: 15,
        status: 'preparing',
        message: 'Preparing video upload...',
      ));

      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/api/posts/create'),
      );

      // Add text fields
      request.fields['user_id'] = userId;
      request.fields['type'] = 'reel';
      request.fields['caption'] = caption;
      request.fields['visibility'] = visibility;
      request.fields['duration'] = videoDuration.toString();
      request.fields['width'] = videoWidth.toString();
      request.fields['height'] = videoHeight.toString();

      // Add video file
      var videoStream = http.ByteStream(videoFile.openRead());
      var videoLength = await videoFile.length();
      var multipartFile = http.MultipartFile(
        'video',
        videoStream,
        videoLength,
        filename: videoFile.path.split('/').last,
        contentType: MediaType.parse(mimeType),
      );
      request.files.add(multipartFile);

      onProgress?.call(UploadProgress(
        progress: 25,
        status: 'uploading',
        message: 'Uploading video...',
      ));

      var response = await request.send();
      var responseBody = await response.stream.bytesToString();

      onProgress?.call(UploadProgress(
        progress: 90,
        status: 'processing',
        message: 'Processing video...',
      ));

      var jsonResponse = json.decode(responseBody);
      var postResponse = PostResponse.fromJson(jsonResponse);

      if (response.statusCode == 200 && postResponse.success) {
        onProgress?.call(UploadProgress(
          progress: 100,
          status: 'completed',
          message: 'Reel uploaded successfully!',
        ));
        return postResponse;
      } else {
        var errorMsg = postResponse.error ?? 'Upload failed';
        onProgress?.call(UploadProgress(
          progress: 0,
          status: 'error',
          message: errorMsg,
        ));
        throw Exception(errorMsg);
      }

    } catch (e) {
      onProgress?.call(UploadProgress(
        progress: 0,
        status: 'error',
        message: 'Upload failed: ${e.toString()}',
      ));
      throw e;
    }
  }

  // =============================================================================
  // 📖 STORY UPLOAD (VIDEO)
  // =============================================================================

  Future<PostResponse> uploadStory({
    required String userId,
    required File videoFile,
    String caption = '',
    int videoWidth = 1080,
    int videoHeight = 1920,
    double videoDuration = 0.0,
    Function(UploadProgress)? onProgress,
  }) async {
    try {
      onProgress?.call(UploadProgress(
        progress: 10,
        status: 'preparing',
        message: 'Preparing story...',
      ));

      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/api/posts/create'),
      );

      // Add text fields
      request.fields['user_id'] = userId;
      request.fields['type'] = 'story';
      request.fields['caption'] = caption;
      request.fields['visibility'] = 'public'; // Stories are always public
      request.fields['duration'] = videoDuration.toString();
      request.fields['width'] = videoWidth.toString();
      request.fields['height'] = videoHeight.toString();

      // Add video file
      var videoStream = http.ByteStream(videoFile.openRead());
      var videoLength = await videoFile.length();
      var multipartFile = http.MultipartFile(
        'video',
        videoStream,
        videoLength,
        filename: videoFile.path.split('/').last,
        contentType: MediaType.parse('video/mp4'),
      );
      request.files.add(multipartFile);

      onProgress?.call(UploadProgress(
        progress: 30,
        status: 'uploading',
        message: 'Uploading story...',
      ));

      var response = await request.send();
      var responseBody = await response.stream.bytesToString();

      onProgress?.call(UploadProgress(
        progress: 80,
        status: 'processing',
        message: 'Processing story...',
      ));

      var jsonResponse = json.decode(responseBody);
      var postResponse = PostResponse.fromJson(jsonResponse);

      if (response.statusCode == 200 && postResponse.success) {
        onProgress?.call(UploadProgress(
          progress: 100,
          status: 'completed',
          message: 'Story uploaded successfully!',
        ));
        return postResponse;
      } else {
        var errorMsg = postResponse.error ?? 'Story upload failed';
        onProgress?.call(UploadProgress(
          progress: 0,
          status: 'error',
          message: errorMsg,
        ));
        throw Exception(errorMsg);
      }

    } catch (e) {
      onProgress?.call(UploadProgress(
        progress: 0,
        status: 'error',
        message: 'Upload failed: ${e.toString()}',
      ));
      throw e;
    }
  }

  // =============================================================================
  // 🧹 CLEANUP
  // =============================================================================

  void dispose() {
    _client.close();
  }
}

// =============================================================================
// 🎯 USAGE EXAMPLES - HOW TO USE IN YOUR FLUTTER APP
// =============================================================================

/*
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
    enableLogging: true,
  );

  File? _selectedVideo;
  final TextEditingController _captionController = TextEditingController();
  UploadProgress? _currentProgress;
  bool _isUploading = false;

  @override
  void dispose() {
    _uploadManager.dispose();
    _captionController.dispose();
    super.dispose();
  }

  // Example 1: Upload Regular Post
  Future<void> _uploadTextPost() async {
    if (_captionController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please enter a caption')),
      );
      return;
    }

    setState(() => _isUploading = true);

    try {
      var response = await _uploadManager.uploadPost(
        userId: 'user123', // Replace with actual user ID
        caption: _captionController.text,
        visibility: 'public',
        onProgress: (progress) {
          setState(() => _currentProgress = progress);
        },
      );

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Post uploaded successfully!')),
      );

    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Upload failed: ${e.toString()}')),
      );
    } finally {
      setState(() => _isUploading = false);
    }
  }

  // Example 2: Upload Reel
  Future<void> _uploadVideoReel() async {
    if (_selectedVideo == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please select a video')),
      );
      return;
    }

    setState(() => _isUploading = true);

    try {
      var response = await _uploadManager.uploadReel(
        userId: 'user123', // Replace with actual user ID
        videoFile: _selectedVideo!,
        caption: _captionController.text,
        visibility: 'public',
        videoWidth: 1080,
        videoHeight: 1920,
        videoDuration: 15.5, // Calculate actual duration
        onProgress: (progress) {
          setState(() => _currentProgress = progress);
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

  // Example 3: Upload Story
  Future<void> _uploadStory() async {
    if (_selectedVideo == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please select a video')),
      );
      return;
    }

    setState(() => _isUploading = true);

    try {
      var response = await _uploadManager.uploadStory(
        userId: 'user123', // Replace with actual user ID
        videoFile: _selectedVideo!,
        caption: _captionController.text,
        videoWidth: 1080,
        videoHeight: 1920,
        videoDuration: 10.0, // Calculate actual duration
        onProgress: (progress) {
          setState(() => _currentProgress = progress);
        },
      );

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Story uploaded successfully!')),
      );

    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Upload failed: ${e.toString()}')),
      );
    } finally {
      setState(() => _isUploading = false);
    }
  }

  // Pick video from gallery
  Future<void> _pickVideo() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickVideo(source: ImageSource.gallery);

    if (pickedFile != null) {
      setState(() => _selectedVideo = File(pickedFile.path));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Upload Post/Reel'),
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
                child: Text('Video selected: ${_selectedVideo!.path.split('/').last}'),
              ),

            SizedBox(height: 16),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                ElevatedButton(
                  onPressed: _isUploading ? null : _uploadTextPost,
                  child: Text('Upload Post'),
                ),
                ElevatedButton(
                  onPressed: _isUploading ? null : _uploadVideoReel,
                  child: Text('Upload Reel'),
                ),
                ElevatedButton(
                  onPressed: _isUploading ? null : _uploadStory,
                  child: Text('Upload Story'),
                ),
              ],
            ),

            if (_isUploading && _currentProgress != null) ...[
              SizedBox(height: 16),
              LinearProgressIndicator(
                value: _currentProgress!.progress / 100.0,
              ),
              SizedBox(height: 8),
              Text(
                '${_currentProgress!.progress}% - ${_currentProgress!.message}',
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
*/

// =============================================================================
// 📦 DEPENDENCIES TO ADD IN pubspec.yaml
// =============================================================================

/*
dependencies:
  flutter:
    sdk: flutter

  # HTTP requests
  http: ^1.1.0

  # File handling
  image_picker: ^1.0.4

  # MIME type detection
  mime: ^1.0.4

  # HTTP parser for multipart
  http_parser: ^4.0.2

  # For better async handling
  async: ^2.11.0
*/

// =============================================================================
// ⚙️ PERMISSIONS TO ADD IN AndroidManifest.xml (Android)
// =============================================================================

/*
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />
*/

// =============================================================================
// 📱 PERMISSIONS FOR iOS (ios/Runner/Info.plist)
// =============================================================================

/*
<key>NSPhotoLibraryUsageDescription</key>
<string>Need access to photo library for uploading videos</string>
<key>NSCameraUsageDescription</key>
<string>Need access to camera for recording videos</string>
<key>NSMicrophoneUsageDescription</key>
<string>Need access to microphone for recording videos</string>
*/

void main() {
  print('🎉 TALKSYRA FLUTTER UPLOAD MANAGER - READY TO USE!');
  print('📋 Copy-paste this entire script into your Flutter project');
  print('🔧 Update baseUrl with your actual API domain');
  print('🚀 Start uploading posts and reels!');
}