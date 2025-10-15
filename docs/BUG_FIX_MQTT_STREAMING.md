# Bug Fix: MQTT Streaming Not Showing in IOT View

## Issue
IOT page (`/iot`) showed empty streaming textarea - no MQTT messages were being displayed even though the server was subscribed to channels (`esp32`, `esp32/#`, `sbqc/iss`).

## Root Cause Analysis

### Problem 1: Duplicate HTTP Server Instances
**Location**: `sbqc_serv.js` lines ~68-78

The code was creating TWO HTTP server instances:
1. `httpServer = http.createServer(app)` with Socket.IO attached
2. `startServer(app)` from serverUtils which creates another server with its own Socket.IO

**Result**: 
- The `httpServer` instance (with MQTT forwarding) was never started (no `.listen()`)
- The `startServer()` instance was listening but had different Socket.IO
- Browser connected to one Socket.IO, MQTT messages went to the other

**Fix**: Removed duplicate `httpServer` creation, letting `startServer()` handle everything.

### Problem 2: Undefined Socket.IO Reference
**Location**: `sbqc_serv.js` line ~46

After removing the duplicate server, the MQTT initialization still referenced:
```javascript
let io;  // Declared but never assigned!
mqtt.initMqtt('...', handler, channels, () => io);
```

**Result**: `getIo()` returned `undefined`, so MQTT messages weren't forwarded to Socket.IO.

**Fix**: Changed to use Socket.IO instance from the socket module:
```javascript
const socketio = require('./scripts/socket');
mqtt.initMqtt('...', handler, channels, () => socketio.get_io());
```

## Files Modified

### `/home/yb/servers/SBQC/sbqc_serv.js`

**Removed** (lines ~65-75):
```javascript
const socketIO = require('socket.io');
const http = require('http');
const httpServer = http.createServer(app);

const io = socketIO(httpServer, {
    cors: {
        origin: (IN_PROD ? process.env.FRONT_URL : "http://localhost:3000" ),
        methods: ["GET", "POST"]
    }
})
```

**Changed** (line ~46):
```javascript
// Before:
let io;
mqtt.initMqtt('mqtt://specialblend.ca', esp32.msgHandler, ['esp32', 'esp32/#', 'sbqc/iss'], () => io);

// After:
const socketio = require('./scripts/socket');
mqtt.initMqtt('mqtt://specialblend.ca', esp32.msgHandler, ['esp32', 'esp32/#', 'sbqc/iss'], () => socketio.get_io());
```

## How It Works Now

1. **Server Start**: `startServer(app)` creates HTTP server
2. **Socket.IO Init**: `socketio.init(server)` attaches Socket.IO to the server
3. **MQTT Init**: MQTT client subscribes to channels and gets Socket.IO via `() => socketio.get_io()`
4. **Message Flow**: 
   - MQTT broker → MQTT client → `mqttServer.js` message handler
   - `io.sockets.emit('mqtt-message', {topic, message})` forwards to all connected clients
   - Browser receives via Socket.IO → Updates `streamTextArea`

## Testing

**Verified**:
- ✅ Server starts without errors
- ✅ Socket.IO connects (`New SocketIO Connection` in logs)
- ✅ MQTT subscriptions active (`Subscribed to channel: sbqc/iss`)
- ✅ Messages appear in IOT page streaming textarea
- ✅ No authentication required (IOT page is public)

## Related Components

- **Frontend**: `/public/js/iot.js` - Handles Socket.IO connection and message display
- **Backend**: 
  - `/scripts/socket.js` - Socket.IO initialization and instance management
  - `/scripts/mqttServer.js` - MQTT client and message forwarding
  - `/utils/serverUtils.js` - Server creation with Socket.IO setup

## Prevention

To avoid similar issues in the future:
1. ✅ Only create ONE HTTP server instance
2. ✅ Let `serverUtils.startServer()` handle server creation
3. ✅ Socket.IO should be initialized in `serverUtils.startServer()`
4. ✅ Use `socket.get_io()` to access Socket.IO instance

---

**Date**: October 15, 2025  
**Fixed by**: AI Assistant  
**Status**: ✅ Resolved
