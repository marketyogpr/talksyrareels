// =============================================================================
// 🎬 VIDEO DURATION HELPER - FLUTTER
// =============================================================================

import 'dart:io';
import 'package:video_player/video_player.dart';

class VideoHelper {
  /// Get video duration in seconds
  static Future<double> getVideoDuration(File videoFile) async {
    try {
      VideoPlayerController controller = VideoPlayerController.file(videoFile);
      await controller.initialize();
      double duration = controller.value.duration.inMilliseconds / 1000.0;
      await controller.dispose();
      return duration;
    } catch (e) {
      print('Error getting video duration: $e');
      return 0.0;
    }
  }

  /// Get video dimensions
  static Future<Map<String, int>> getVideoDimensions(File videoFile) async {
    try {
      VideoPlayerController controller = VideoPlayerController.file(videoFile);
      await controller.initialize();
      int width = controller.value.size.width.toInt();
      int height = controller.value.size.height.toInt();
      await controller.dispose();

      return {
        'width': width,
        'height': height,
      };
    } catch (e) {
      print('Error getting video dimensions: $e');
      return {
        'width': 1080,
        'height': 1920,
      };
    }
  }

  /// Validate video file
  static Future<bool> validateVideoFile(File videoFile) async {
    try {
      // Check if file exists
      if (!await videoFile.exists()) {
        return false;
      }

      // Check file size (max 100MB)
      int fileSize = await videoFile.length();
      int maxSize = 100 * 1024 * 1024; // 100MB
      if (fileSize > maxSize) {
        return false;
      }

      // Check if it's actually a video file
      String extension = videoFile.path.split('.').last.toLowerCase();
      List<String> supportedFormats = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
      if (!supportedFormats.contains(extension)) {
        return false;
      }

      // Try to initialize video player to verify it's a valid video
      VideoPlayerController controller = VideoPlayerController.file(videoFile);
      await controller.initialize();
      await controller.dispose();

      return true;
    } catch (e) {
      print('Video validation failed: $e');
      return false;
    }
  }
}

// =============================================================================
// 📊 USAGE EXAMPLE WITH VIDEO HELPER
// =============================================================================

/*
Future<void> _uploadReelWithValidation() async {
  if (_selectedVideo == null) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Please select a video')),
    );
    return;
  }

  // Validate video first
  bool isValid = await VideoHelper.validateVideoFile(_selectedVideo!);
  if (!isValid) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Invalid video file. Please select a valid video.')),
    );
    return;
  }

  setState(() => _isUploading = true);

  try {
    // Get video metadata
    double duration = await VideoHelper.getVideoDuration(_selectedVideo!);
    Map<String, int> dimensions = await VideoHelper.getVideoDimensions(_selectedVideo!);

    // Upload with metadata
    var response = await _uploadManager.uploadReel(
      userId: 'user123',
      videoFile: _selectedVideo!,
      caption: _captionController.text,
      videoDuration: duration,
      videoWidth: dimensions['width'] ?? 1080,
      videoHeight: dimensions['height'] ?? 1920,
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
*/

// =============================================================================
// 📦 ADDITIONAL DEPENDENCY FOR VIDEO HELPER
// =============================================================================

/*
Add this to pubspec.yaml:

dependencies:
  video_player: ^2.8.1  # For video duration and dimensions
*/

print('🎬 VIDEO HELPER - Ready to use with Flutter upload script!');