# DataAPI Endpoints Reference

**Date:** 2025-01-11  
**Source:** GitHub Investigation of [WindriderQc/DataAPI](https://github.com/WindriderQc/DataAPI)

## Overview

This document provides the **authoritative list** of available DataAPI endpoints based on the actual codebase. Use this reference when integrating SBQC with DataAPI to avoid calling non-existent endpoints.

---

## ✅ Heartbeat Endpoints

### 1. Get Latest Heartbeat for Specific Device
```
GET /heartbeats/senderLatest/:esp
```

**Controller:** `heartbeatController.senderLatest`  
**Purpose:** Returns the most recent heartbeat for a specific device  

**Example:**
```bash
GET https://data.specialblend.ca/heartbeats/senderLatest/ESP_35030
```

**Response:**
```json
{
  "status": "success",
  "message": "Latest heartbeat retreived",
  "data": [
    {
      "_id": "...",
      "sender": "ESP_35030",
      "time": "2025-01-11T10:30:00.000Z",
      "CPUtemp": 47.78,
      "wifi": -54,
      "battery": 3.7,
      "co2": 400,
      "smoke": 0,
      "lpg": 0,
      ...
    }
  ]
}
```

**Used By:** `getDeviceLatest()` in `services/dataApiService.js`

---

### 2. Get Paginated Heartbeats
```
GET /api/v1/heartbeats?skip=0&limit=10&sort=desc
```

**Controller:** `heartbeatController.index`  
**Purpose:** Returns paginated list of all heartbeats  

**Query Parameters:**
- `skip` (default: 0) - Number of records to skip
- `limit` (default: 5, max: 50) - Number of records to return
- `sort` (default: 'desc') - Sort order: 'asc' or 'desc'

**Response:**
```json
{
  "status": "success",
  "message": "Heartbeats retrieved successfully",
  "data": [...],
  "meta": {
    "total": 1234,
    "sort": "desc",
    "skip": 0,
    "limit": 10,
    "has_more": true
  }
}
```

---

### 3. Get Historical Device Data
```
GET /heartbeats/data/:ratio,:espID,:startDate
```

**Controller:** `heartbeatController.data`  
**Purpose:** Returns historical heartbeat data for a device with sampling ratio  

**Example:**
```bash
GET https://data.specialblend.ca/heartbeats/data/10,ESP_35030,2025-01-01
```

**Parameters:**
- `ratio` - Sampling ratio (e.g., 10 = every 10th record)
- `espID` - Device ID
- `startDate` - Start date for data retrieval

**Response:**
```json
{
  "status": "success",
  "message": "Data with options {\"ratio\":10,\"espID\":\"ESP_35030\",\"startDate\":\"2025-01-01\"} retreived",
  "data": [...]
}
```

**Used By:** `getDeviceData()` in `services/dataApiService.js`

---

### 4. Get Oldest Heartbeat
```
GET /heartbeats/senderOldest/:esp
```

**Controller:** `heartbeatController.senderOldest`  
**Purpose:** Returns the oldest heartbeat for a specific device

---

### 5. Get Distinct Senders
```
GET /heartbeats/sendersDistinct
```

**Controller:** `heartbeatController.sendersDistinct`  
**Purpose:** Returns list of all unique device IDs that have sent heartbeats

**Response:**
```json
{
  "status": "success",
  "message": "Latest heartbeaters retrieved",
  "data": ["ESP_35030", "ESP_15605", "ESP_30819"]
}
```

---

## ❌ Non-Existent Endpoints

### Batch Endpoint (DOES NOT EXIST)
```
GET /api/v1/heartbeats/latest-batch  ❌ NOT AVAILABLE
POST /api/v1/heartbeats/latest-batch  ❌ NOT AVAILABLE
```

**Why It Doesn't Work:**
- This endpoint does not exist in the DataAPI codebase
- Attempts to call it result in 404 (Cannot POST) or 400 (Invalid ID format)
- No batch fetching functionality is implemented

**Solution:**
Use parallel individual requests to `/heartbeats/senderLatest/:esp` instead:

```javascript
async function getLatestForAllDevices(deviceIds) {
    const promises = deviceIds.map(id => 
        getDeviceLatest(id).catch(err => {
            console.warn(`Failed for ${id}:`, err.message);
            return null;
        })
    );
    
    const results = await Promise.all(promises);
    return results.filter(r => r !== null);
}
```

**Performance:**
- 3 parallel requests: ~100ms
- 3 sequential requests: ~300ms
- Graceful degradation: Failed devices don't break entire batch

---

## 📋 Other Available Endpoints

### Devices
```
GET /api/v1/devices                 - List all devices (paginated)
GET /api/v1/devices/:id             - Get device by ID
POST /api/v1/devices                - Create device
PATCH /api/v1/devices/:id           - Update device
DELETE /api/v1/devices/:id          - Delete device
```

### Profiles
```
GET /api/v1/profiles                - List all profiles
POST /api/v1/profiles               - Create profile
POST /api/v1/users/:id/assign-profile - Assign profile to user
```

### Alarms
```
GET /api/v1/alarms                  - List alarms (paginated)
POST /api/v1/alarms                 - Create/update alarm
GET /api/v1/alarms?espID=X&io=Y     - Get specific alarm
```

### External APIs (Proxied)
```
GET /api/v1/weather                 - Weather data
GET /api/v1/tides                   - Tide data
GET /api/v1/tle                     - TLE data
GET /api/v1/pressure                - Pressure data
GET /api/v1/ec-weather              - Environment Canada weather
```

### Live Data
```
GET /api/v1/iss                     - ISS location data
GET /api/v1/quakes                  - Earthquake data
```

### Logs
```
GET /api/v1/v2/logs?source=userLogs - Get paginated logs
POST /api/v1/logs/user              - Create user log
GET /api/v1/logs/user               - Get user logs
POST /api/v1/logs/server            - Create server log
GET /api/v1/logs/server             - Get server logs
GET /api/v1/logs/countries          - Get country counts
```

### Mews (Example Endpoints)
```
GET /api/v1/mews                    - Legacy: Returns array
GET /api/v1/v2/mews                 - V2: Returns paginated with meta
POST /api/v1/mews                   - Create mew
```

---

## 🔧 Heartbeat Model Schema

```javascript
{
  sender: String,           // Device ID (e.g., "ESP_35030")
  time: Date,               // Timestamp
  CPUtemp: Number,          // CPU temperature
  wifi: Number,             // WiFi signal strength
  battery: Number,          // Battery voltage
  co2: Number,              // CO2 level
  smoke: Number,            // Smoke level
  lpg: Number,              // LPG level
  tempBM_280: Number,       // BM280 temperature
  pressure: Number,         // Atmospheric pressure
  altitude: Number,         // Altitude
  airHumid: Number,         // Air humidity
  tempDht: Number,          // DHT sensor temperature
  ir: Number,               // Infrared
  full: Number,             // Full spectrum light
  visible: Number,          // Visible light
  lux: Number               // Light intensity in lux
}
```

---

## 📚 Standard Response Format

All DataAPI endpoints follow this standard format:

**Success:**
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": [...],
  "meta": {
    "total": 100,
    "skip": 0,
    "limit": 10,
    "has_more": true
  }
}
```

**Error:**
```json
{
  "status": "error",
  "message": "Error description",
  "error": "..."
}
```

---

## 🛡️ Authentication

DataAPI uses **session-based authentication** with MongoDB session storage:

- **Session Store:** MongoDB (`datas/devdatas.mySessions`)
- **Cookie:** `data-api.sid`
- **Shared:** Sessions are shared between DataAPI and SBQC
- **Middleware:** `res.locals.user` populated by nodeTools auth

**Protected Endpoints:**
- `/admin-feed` - Requires auth + admin role
- `/tools` - Requires auth
- `/databases` - Requires auth

**Public Endpoints:**
- `/api/v1/heartbeats/*` - Public access
- `/api/v1/devices/*` - Public access
- `/api/v1/iss` - Public access
- `/api/v1/quakes` - Public access

---

## 📖 References

- **GitHub Repository:** https://github.com/WindriderQc/DataAPI
- **Heartbeat Controller:** `controllers/heartbeatController.js`
- **API Routes:** `routes/api.routes.js`
- **Heartbeat Model:** `models/heartbeatModel.js`
- **APIFeatures Utility:** `utils/apiFeatures.js`

---

## ⚠️ Migration Notes

### If You're Currently Using `/api/v1/heartbeats/latest-batch`:

**STOP!** This endpoint doesn't exist. Update your code to use:

**Before (BROKEN):**
```javascript
// ❌ This doesn't work
const response = await fetch(`${dataAPIUrl}/api/v1/heartbeats/latest-batch?ids=${ids.join(',')}`);
```

**After (WORKING):**
```javascript
// ✅ Use parallel individual requests
const promises = deviceIds.map(id => 
    fetch(`${dataAPIUrl}/heartbeats/senderLatest/${id}`)
        .then(r => r.json())
        .catch(err => {
            console.warn(`Failed for ${id}:`, err.message);
            return null;
        })
);
const results = await Promise.all(promises);
const validResults = results.filter(r => r !== null);
```

**Implementation in SBQC:**
See `services/dataApiService.js` → `getLatestForAllDevices()` for working example.

---

**Last Updated:** 2025-01-11  
**Status:** ✅ Verified against GitHub source code
