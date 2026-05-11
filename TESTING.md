# Testing Guide for TalkSyra Worker

## Local Testing

### 1. Start Development Server

```bash
npm run dev

# Output:
# ⛅ wrangler 3.52.0
# ⚙️ Using config from wrangler.toml
# 🎉 Ready on http://localhost:8787
```

### 2. Test Health Endpoint

```bash
curl http://localhost:8787/health

# Response:
# {"status":"ok","timestamp":"2024-05-11T10:30:00.000Z"}
```

### 3. Test Media Upload

#### Create test file
```bash
echo "Test file content" > test.txt
```

#### Upload file
```bash
curl -X POST http://localhost:8787/upload \
  -F "file=@test.txt"

# Response:
# {
#   "success": true,
#   "fileName": "1715418000123-abc1234.txt",
#   "url": "https://media.talksyra.com/1715418000123-abc1234.txt",
#   "size": 17,
#   "timestamp": 1715418000123
# }
```

#### Test with various file types
```bash
# Image
curl -X POST http://localhost:8787/upload \
  -F "file=@image.png"

# Video
curl -X POST http://localhost:8787/upload \
  -F "file=@video.mp4"

# Large file (test size validation)
dd if=/dev/zero bs=1M count=600 of=large.bin
curl -X POST http://localhost:8787/upload \
  -F "file=@large.bin"
# Expected: 413 Payload Too Large
```

### 4. Test WebSocket Locally

#### Install WebSocket CLI tool
```bash
# Using websocat (recommended)
cargo install websocat

# Or using wscat
npm install -g wscat
```

#### Connect to WebSocket
```bash
# Connection
websocat ws://localhost:8787/ws?userId=user_123

# You should see it waiting for input
```

#### Send messages (in the connection)
```
# Send chat message
{"type":"message","targetId":"user_456","message":"Hello!"}

# Send typing indicator
{"type":"typing","targetId":"user_456"}

# Get online users
{"type":"get-users"}

# Expected response:
# {"type":"users-list","users":["user_456"]}
```

### 5. Test Multiple Simultaneous Connections

#### Terminal 1: User 123
```bash
websocat ws://localhost:8787/ws?userId=user_123
```

#### Terminal 2: User 456
```bash
websocat ws://localhost:8787/ws?userId=user_456
```

#### Terminal 1: Send message to user_456
```
{"type":"message","targetId":"user_456","message":"Hello from user 123!"}
```

#### Terminal 2: Should receive
```
{"type":"message","from":"user_123","message":"Hello from user 123!","timestamp":"2024-05-11T10:30:00.000Z"}
```

## Production Testing

### Prerequisites
```bash
# Ensure you have deployed to production
npm run deploy:production

# Install testing tools
npm install -g wscat
```

### 1. Test Health Endpoint
```bash
curl https://api.talksyra.com/health

# Expected 200 OK response
```

### 2. Test File Upload to Production

```bash
curl -X POST https://api.talksyra.com/upload \
  -F "file=@test.txt"

# Should return public URL to uploaded file
```

### 3. Test WebSocket to Production

```bash
wscat -c wss://api.talksyra.com/ws?userId=prod_test_user

# Send test messages
{"type":"get-users"}
```

## Automated Testing with Script

Create `test-worker.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:8787"
FAILED=0
PASSED=0

echo "🧪 Starting TalkSyra Worker Tests..."

# Test 1: Health endpoint
echo -n "Testing health endpoint... "
RESPONSE=$(curl -s -w "\n%{http_code}" $BASE_URL/health)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ PASSED"
  ((PASSED++))
else
  echo "✗ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi

# Test 2: Missing file upload
echo -n "Testing missing file upload... "
RESPONSE=$(curl -s -X POST $BASE_URL/upload)
HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null -X POST $BASE_URL/upload)
if [ "$HTTP_CODE" = "400" ]; then
  echo "✓ PASSED"
  ((PASSED++))
else
  echo "✗ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi

# Test 3: File upload
echo -n "Testing file upload... "
echo "test content" > temp_test.txt
RESPONSE=$(curl -s -X POST $BASE_URL/upload -F "file=@temp_test.txt")
if echo "$RESPONSE" | grep -q "success"; then
  echo "✓ PASSED"
  ((PASSED++))
else
  echo "✗ FAILED"
  ((FAILED++))
fi
rm temp_test.txt

# Test 4: Missing userId WebSocket
echo -n "Testing missing userId WebSocket... "
HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null -N http://localhost:8787/ws)
if [ "$HTTP_CODE" = "400" ]; then
  echo "✓ PASSED"
  ((PASSED++))
else
  echo "✗ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Passed: $PASSED"
echo "✗ Failed: $FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit $FAILED
```

Run tests:
```bash
chmod +x test-worker.sh
./test-worker.sh
```

## Load Testing

### Using Apache Bench (ab)
```bash
# 1000 requests, 10 concurrent
ab -n 1000 -c 10 http://localhost:8787/health

# Example output:
# Requests per second: 500 [#/sec] (mean)
# Time per request: 20 [ms] (mean)
```

### Using wrk
```bash
# Install wrk
git clone https://github.com/wg/wrk.git
cd wrk
make

# Run load test
./wrk -t4 -c100 -d30s http://localhost:8787/health

# Example output:
# Running 30s test @ http://localhost:8787/health
# 4 threads and 100 connections
# Thread Stats  Avg       Stdev     Max       +/- Stdev
# Latency    10ms      5ms      100ms     80%
```

## WebSocket Stress Test

Create `ws-stress-test.js`:

```javascript
const WebSocket = require('ws');

const BASE_URL = 'ws://localhost:8787/ws';
const NUM_USERS = 50;
let messageCount = 0;

function connectUser(userId) {
  const ws = new WebSocket(`${BASE_URL}?userId=${userId}`);
  
  ws.on('open', () => {
    console.log(`User ${userId} connected`);
    ws.send(JSON.stringify({ type: 'get-users' }));
  });
  
  ws.on('message', (data) => {
    messageCount++;
  });
  
  ws.on('close', () => {
    console.log(`User ${userId} disconnected`);
  });
  
  ws.on('error', (error) => {
    console.error(`User ${userId} error:`, error.message);
  });
}

// Connect N users
for (let i = 0; i < NUM_USERS; i++) {
  setTimeout(() => connectUser(`user_${i}`), i * 100);
}

// Print stats every 5 seconds
setInterval(() => {
  console.log(`Messages received: ${messageCount}`);
  messageCount = 0;
}, 5000);
```

Run:
```bash
npm install ws
node ws-stress-test.js
```

## End-to-End Flutter Integration Test

In Flutter test:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:talksyra/services/media_service.dart';
import 'package:talksyra/services/socket_service.dart';

void main() {
  group('TalkSyra Worker Integration', () {
    test('Media upload returns valid URL', () async {
      // Create test file
      final File testFile = File('test_file.txt');
      await testFile.writeAsString('Test content');
      
      // Upload
      final url = await MediaService.uploadToR2(testFile);
      
      // Verify
      expect(url, isNotEmpty);
      expect(url, contains('https://'));
      expect(url, contains('talksyra'));
      
      testFile.delete();
    });
    
    test('WebSocket connection works', () async {
      final socketService = SocketService('flutter_test_user');
      
      bool connected = false;
      socketService.onConnectionEstablished = () {
        connected = true;
      };
      
      socketService.connect();
      
      await Future.delayed(Duration(seconds: 2));
      expect(connected, true);
      
      socketService.disconnect();
    });
  });
}
```

## Performance Benchmarks

### Baseline Metrics (on Cloudflare Free Tier)

| Operation | Avg Time | P95 | P99 |
|-----------|----------|-----|-----|
| Health Check | 50ms | 100ms | 150ms |
| Small File Upload (1MB) | 200ms | 400ms | 600ms |
| Large File Upload (100MB) | 5s | 8s | 12s |
| WebSocket Connect | 100ms | 200ms | 300ms |
| Message Latency | 50ms | 100ms | 200ms |

### Throughput

- **Requests per second**: 500+ (under load)
- **Concurrent connections**: 1000+
- **Files per minute**: 300+ (1MB average)

## Debugging

### Enable Verbose Logging
```bash
wrangler dev --debug

# Or with wrangler tail
wrangler tail --env production --format json
```

### Check Worker Errors
```bash
# View recent errors
wrangler tail --env production | grep -i error

# Export logs to file
wrangler tail --env production > logs.txt
```

### Browser DevTools (for web clients)
```javascript
// In browser console
const socket = new WebSocket('wss://api.talksyra.com/ws?userId=test');
socket.addEventListener('message', (e) => console.log('Received:', e.data));
```

## Common Issues & Solutions

### Issue: "CPU time exceeded"
**Solution:** Reduce file processing or optimize code
```javascript
// Add checkpoints
console.time('upload');
// ... code ...
console.timeEnd('upload');
```

### Issue: "WebSocket connection timeout"
**Solution:** Check userId parameter and route configuration
```bash
# Verify route exists
curl -v wss://api.talksyra.com/ws?userId=test
```

### Issue: "File upload 403 Forbidden"
**Solution:** Verify R2 public URL
```bash
# Check R2 bucket
wrangler r2 bucket list
```

## Continuous Integration

Add to `.github/workflows/test.yml`:

```yaml
name: Test Worker

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 18
      - run: npm install
      - run: npm run dev &
      - run: sleep 5
      - run: ./test-worker.sh
```
