/**
 * Flutter Service Examples
 * 
 * These Dart services demonstrate how to integrate with the TalkSyra Cloudflare Worker
 * Copy these patterns into your Flutter project
 */

// ============================================================================
// FILE: lib/services/media_service.dart
// ============================================================================

import 'dart:io';
import 'package:http/http.dart' as http;
import 'dart:convert';

class MediaService {
  static const String UPLOAD_URL = 'https://api.talksyra.com/upload';
  
  /// Upload file to R2 bucket
  /// Returns the public URL of uploaded file
  static Future<String> uploadToR2(File file) async {
    try {
      var request = http.MultipartRequest('POST', Uri.parse(UPLOAD_URL));
      request.files.add(
        await http.MultipartFile.fromPath('file', file.path),
      );
      
      var response = await request.send();
      var responseBody = await response.stream.bytesToString();
      
      if (response.statusCode == 200) {
        final json = jsonDecode(responseBody);
        return json['url']; // Public URL to access file
      } else {
        throw Exception('Upload failed: ${response.statusCode} - $responseBody');
      }
    } catch (e) {
      print('Media upload error: $e');
      rethrow;
    }
  }
  
  /// Upload video file
  static Future<String> uploadVideo(File videoFile) async {
    return await uploadToR2(videoFile);
  }
  
  /// Upload image file
  static Future<String> uploadImage(File imageFile) async {
    return await uploadToR2(imageFile);
  }
  
  /// Upload reel (short video)
  static Future<String> uploadReel(File reelFile) async {
    return await uploadToR2(reelFile);
  }
}


// ============================================================================
// FILE: lib/services/socket_service.dart
// ============================================================================

import 'package:web_socket_channel/web_socket_channel.dart';
import 'dart:convert';

class SocketService {
  late WebSocketChannel channel;
  final String userId;
  final String serverUrl = 'wss://api.talksyra.com/ws';
  
  // Callbacks for different event types
  Function(String, String)? onMessageReceived;
  Function(String)? onTypingReceived;
  Function(String, Map)? onWebRTCSignal;
  Function(String, String)? onUserStatusChanged;
  Function(List<String>)? onUsersListReceived;
  Function()? onConnectionEstablished;
  Function()? onConnectionClosed;
  
  SocketService(this.userId);

  /// Connect to WebSocket server
  void connect() {
    try {
      channel = WebSocketChannel.connect(
        Uri.parse('$serverUrl?userId=$userId'),
      );
      
      print('Connecting to WebSocket...');
      
      channel.stream.listen(
        (message) => _handleMessage(message),
        onError: (error) {
          print('WebSocket error: $error');
        },
        onDone: () {
          print('WebSocket closed');
          onConnectionClosed?.call();
        },
      );
      
      onConnectionEstablished?.call();
    } catch (e) {
      print('Connection error: $e');
      rethrow;
    }
  }

  /// Handle incoming messages from server
  void _handleMessage(dynamic message) {
    try {
      final Map<String, dynamic> data = jsonDecode(message);
      final String type = data['type'];
      
      switch (type) {
        case 'message':
          final from = data['from'];
          final msg = data['message'];
          onMessageReceived?.call(from, msg);
          break;
          
        case 'typing':
          final from = data['from'];
          onTypingReceived?.call(from);
          break;
          
        case 'offer':
        case 'answer':
        case 'candidate':
          final from = data['from'];
          final payload = data['payload'] ?? {};
          onWebRTCSignal?.call(from, {
            'type': type,
            'payload': payload,
          });
          break;
          
        case 'user-status':
          final userId = data['userId'];
          final status = data['status'];
          onUserStatusChanged?.call(userId, status);
          break;
          
        case 'users-list':
          final users = List<String>.from(data['users'] ?? []);
          onUsersListReceived?.call(users);
          break;
          
        case 'error':
          print('Server error: ${data['message']}');
          break;
          
        default:
          print('Unknown message type: $type');
      }
    } catch (e) {
      print('Message handling error: $e');
    }
  }

  /// Send chat message
  void sendMessage(String targetId, String message) {
    _sendData({
      'type': 'message',
      'targetId': targetId,
      'message': message,
    });
  }

  /// Send typing indicator
  void sendTyping(String targetId) {
    _sendData({
      'type': 'typing',
      'targetId': targetId,
    });
  }

  /// Send WebRTC offer
  void sendOffer(String targetId, Map<String, dynamic> offer) {
    _sendData({
      'type': 'offer',
      'targetId': targetId,
      'payload': offer,
    });
  }

  /// Send WebRTC answer
  void sendAnswer(String targetId, Map<String, dynamic> answer) {
    _sendData({
      'type': 'answer',
      'targetId': targetId,
      'payload': answer,
    });
  }

  /// Send ICE candidate
  void sendCandidate(String targetId, Map<String, dynamic> candidate) {
    _sendData({
      'type': 'candidate',
      'targetId': targetId,
      'payload': candidate,
    });
  }

  /// Send call request
  void sendCallRequest(String targetId, {String callType = 'voice'}) {
    _sendData({
      'type': 'call-request',
      'targetId': targetId,
      'payload': {'callType': callType},
    });
  }

  /// Decline incoming call
  void declineCall(String targetId) {
    _sendData({
      'type': 'call-decline',
      'targetId': targetId,
    });
  }

  /// End active call
  void endCall(String targetId) {
    _sendData({
      'type': 'call-end',
      'targetId': targetId,
    });
  }

  /// Request list of online users
  void getOnlineUsers() {
    _sendData({'type': 'get-users'});
  }

  /// Internal method to send data
  void _sendData(Map<String, dynamic> data) {
    try {
      if (channel != null) {
        channel.sink.add(jsonEncode(data));
      } else {
        print('WebSocket not connected');
      }
    } catch (e) {
      print('Send error: $e');
    }
  }

  /// Disconnect from WebSocket
  void disconnect() {
    try {
      channel.sink.close();
    } catch (e) {
      print('Disconnect error: $e');
    }
  }

  /// Check if connected
  bool get isConnected => channel != null;
}


// ============================================================================
// FILE: lib/providers/communication_provider.dart
// ============================================================================

import 'package:flutter/material.dart';
import 'dart:io';

class CommunicationProvider extends ChangeNotifier {
  final String userId;
  late SocketService socketService;
  late MediaService mediaService;
  
  List<String> onlineUsers = [];
  Map<String, String> userTypingStatus = {}; // userId -> typing status
  
  CommunicationProvider({required this.userId}) {
    socketService = SocketService(userId);
    mediaService = MediaService();
    _setupSocketCallbacks();
  }

  void _setupSocketCallbacks() {
    socketService.onConnectionEstablished = () {
      print('Connected to server');
      socketService.getOnlineUsers();
      notifyListeners();
    };
    
    socketService.onMessageReceived = (from, message) {
      print('Message from $from: $message');
      // Handle received message (update UI, show notification, etc.)
      notifyListeners();
    };
    
    socketService.onTypingReceived = (from) {
      userTypingStatus[from] = 'typing';
      notifyListeners();
    };
    
    socketService.onUserStatusChanged = (userId, status) {
      print('User $userId is $status');
      if (status == 'online' && !onlineUsers.contains(userId)) {
        onlineUsers.add(userId);
      } else if (status == 'offline') {
        onlineUsers.remove(userId);
      }
      notifyListeners();
    };
    
    socketService.onUsersListReceived = (users) {
      onlineUsers = users;
      notifyListeners();
    };
  }

  /// Initialize connection
  void initializeConnection() {
    socketService.connect();
  }

  /// Upload file and get public URL
  Future<String> uploadFile(File file) async {
    try {
      final url = await MediaService.uploadToR2(file);
      print('File uploaded: $url');
      return url;
    } catch (e) {
      print('Upload failed: $e');
      rethrow;
    }
  }

  /// Send message to user
  void sendMessageToUser(String targetId, String message) {
    socketService.sendMessage(targetId, message);
  }

  /// Send typing indicator
  void notifyTyping(String targetId) {
    socketService.sendTyping(targetId);
  }

  /// Request video call
  void requestVideoCall(String targetId) {
    socketService.sendCallRequest(targetId, callType: 'video');
  }

  /// Request audio call
  void requestAudioCall(String targetId) {
    socketService.sendCallRequest(targetId, callType: 'voice');
  }

  /// Cleanup on provider disposal
  @override
  void dispose() {
    socketService.disconnect();
    super.dispose();
  }
}
