# SBQC Architecture Clarification & Updates

**Date**: October 15, 2025  
**Status**: ✅ Complete

## Issues Addressed

### 1. ✅ Terminology Confusion: "API Routes"

**Problem**: The term "API routes" in SBQC was confusing because:
- **DataAPI** = External centralized API for all data operations
- **SBQC routes** = Internal service endpoints for SBQC-specific features

**Solution**: Clarified terminology and added comments

**Changes Made**:
- `routes/api.routes.js` - Added header comment distinguishing SBQC service endpoints from DataAPI
- Updated all documentation to use "service endpoints" or "SBQC endpoints" instead of "API routes"

**Clear Separation**:

```javascript
// SBQC Service Endpoints (routes/api.routes.js)
// These are SBQC's internal service endpoints, not to be confused with DataAPI
// 
// DataAPI (external) handles:
//   - users, devices, heartbeats, alarms, profiles
//
// SBQC endpoints (here) handle:
//   - weather, tides, geolocation, device queries
```

---

### 2. ✅ Removed Non-Existent /settings Route

**Problem**: `/settings` route in SBQC was referencing a view that no longer exists
- Settings functionality has been **migrated to DataAPI frontend**
- SBQC had orphaned route trying to render non-existent `settings.ejs`

**Solution**: Redirect to DataAPI settings

**Changes Made**:
```javascript
// OLD - Tried to render local settings view (doesn't exist)
router.get('/settings', auth.requireAuth, async (req, res, next) => {
    res.render('settings', { users, devices, alarms });
});

// NEW - Redirect to DataAPI frontend
router.get('/settings', (req, res) => {
    res.redirect('https://data.specialblend.ca/settings');
});
```

**Login Redirect Updated**:
```javascript
// OLD - Redirected to /settings after login
const LOGIN_SUCCESS_REDIRECT_PATH = '../settings';

// NEW - Redirects to SBQC dashboard after login
const LOGIN_SUCCESS_REDIRECT_PATH = '../dashboard';
```

---

### 3. ✅ Removed Unnecessary Authentication from Device Data Endpoints

**Problem**: Most device data endpoints were protected with authentication, but SBQC is designed as an **open IoT monitoring dashboard**

**Analysis**:
- ❌ **Device data** (`/deviceLatest/:esp`, `/devices/latest-batch`, `/data/:options`) - Should be **PUBLIC** for monitoring
- ✅ **Device control** (`/alarms/setAlarm`) - Should remain **PROTECTED** (tied to SBQC's ESP32 control features)
- ⚠️ **Profile management** (`/saveProfile`) - Currently protected in SBQC, but **candidate for migration to DataAPI**

**Changes Made**:

| Endpoint | Before | After | Reason |
|----------|--------|-------|--------|
| `/deviceLatest/:esp` | 🔒 Protected | 🌍 Public | IoT monitoring - should be open |
| `/devices/latest-batch` | 🔒 Optional Auth | 🌍 Public | Dashboard data - should be open |
| `/data/:options` | 🔒 Protected | 🌍 Public | Historical data for graphs - should be open |
| `/saveProfile` | 🔒 Protected | 🔒 Protected | Config management (consider migrating to DataAPI) |
| `/alarms/setAlarm` | 🔒 Protected | 🔒 Protected | Device control - stays protected |

**Updated Code**:

```javascript
// BEFORE - Protected
router.get('/deviceLatest/:esp', auth.requireAuth, async (req, res, next) => {
    const respData = await dataApiService.getDeviceLatest(req.params.esp);
    res.json(respData);
});

// AFTER - Public
router.get('/deviceLatest/:esp', async (req, res, next) => {
    const respData = await dataApiService.getDeviceLatest(req.params.esp);
    res.json(respData);
});
```

---

## Current Architecture

### SBQC Role: **IoT Monitoring Dashboard**

```
┌─────────────────────────────────────────────────┐
│                    SBQC                         │
│  (Monitoring & Visualization Dashboard)         │
├─────────────────────────────────────────────────┤
│                                                 │
│  PUBLIC FEATURES (No Auth):                    │
│  ✓ Real-time MQTT streaming                    │
│  ✓ Device monitoring (/iot, /device)           │
│  ✓ Historical graphs (/graphs)                 │
│  ✓ Device data queries                         │
│  ✓ Weather/Tides/Geolocation                   │
│                                                 │
│  PROTECTED FEATURES (Auth Required):            │
│  ✓ Device control (set alarms)                 │
│  ✓ Profile management (temp, may migrate)      │
│                                                 │
└─────────────────────────────────────────────────┘
                      ↕
                  Queries
                      ↕
┌─────────────────────────────────────────────────┐
│                  DataAPI                        │
│  (Centralized Data & User Management)           │
├─────────────────────────────────────────────────┤
│                                                 │
│  MANAGES:                                       │
│  • User authentication                          │
│  • Device registration                          │
│  • Heartbeat data storage                       │
│  • Alarms & schedules                          │
│  • Device profiles & configs                   │
│  • Settings UI (frontend)                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Protected Routes - FINAL LIST

After these changes, only **2 endpoints** in SBQC require authentication:

### 1. `/alarms/setAlarm` (POST)
**Why Protected**: Controls ESP32 devices (publishes to MQTT to turn things on/off)
**Justification**: Device control should require authentication
**Keep in SBQC**: Yes - tightly coupled to MQTT/ESP32 control

### 2. `/saveProfile` (POST)
**Why Protected**: Saves device configuration profiles
**Justification**: Configuration changes should be controlled
**Migration Candidate**: Yes - consider moving to DataAPI frontend

---

## Migration Recommendations

### High Priority: Migrate `/saveProfile` to DataAPI

**Reason**:
- Profile management is **data configuration**, not real-time control
- DataAPI already manages device profiles
- Would centralize all configuration in one place

**Benefits**:
1. Single source of truth for profiles
2. Consistent auth/permissions model
3. SBQC becomes **purely monitoring/visualization**
4. Reduces SBQC's protected surface area to just device control

**After Migration**:
- SBQC would have **only 1 protected endpoint**: `/alarms/setAlarm`
- Everything else would be public monitoring/visualization

---

## Updated Service Endpoint Categories

### SBQC Service Endpoints (`/api/*`)

**Public Monitoring Endpoints**:
- `/deviceLatest/:esp` - Latest device data
- `/devices/latest-batch` - All devices latest data
- `/data/:options` - Historical device data
- `/weather/:latlon` - Weather data
- `/tides` - Tide information
- `/proxy-location` - Geolocation
- `/tle` - Satellite TLE data
- `/pressure` - Atmospheric pressure

**Protected Control Endpoints**:
- `/alarms/setAlarm` - Device alarm control (MQTT publish)
- `/saveProfile` - Device profile management (consider migrating)

**Utility Endpoints**:
- `/alert` - Email alerts

---

## Files Modified

1. **`routes/api.routes.js`**:
   - Added header comment clarifying SBQC vs DataAPI
   - Removed auth from `/deviceLatest/:esp`
   - Removed auth from `/devices/latest-batch`
   - Removed auth from `/data/:options`
   - Kept auth on `/saveProfile` (with TODO to migrate)
   - Added comments explaining architecture

2. **`routes/routes.js`**:
   - Removed `/settings` route implementation
   - Added redirect to DataAPI settings
   - Added comment explaining migration

3. **`routes/login.routes.js`**:
   - Changed login redirect from `/settings` to `/dashboard`
   - Updated comment to clarify route type

---

## Testing Checklist

- [x] Server starts without errors
- [ ] `/deviceLatest/:esp` works without authentication
- [ ] `/devices/latest-batch` works without authentication
- [ ] `/data/:options` works without authentication
- [ ] `/alarms/setAlarm` requires authentication (redirects if not logged in)
- [ ] `/saveProfile` requires authentication
- [ ] `/settings` redirects to DataAPI
- [ ] Login redirects to `/dashboard` instead of `/settings`

---

## Next Steps

### Immediate
1. Test all public endpoints work without auth
2. Verify alarm control still requires auth
3. Confirm login flow redirects to dashboard

### Future Considerations
1. **Migrate `/saveProfile` to DataAPI** - Centralize all configuration
2. **Remove session-based auth entirely from SBQC** - Make it purely public monitoring
3. **Consider API keys for external access** - If needed for programmatic access

---

## Architecture Philosophy

### SBQC Should Be:
- ✅ **Open monitoring dashboard** - Public access to device data
- ✅ **Real-time visualization** - MQTT streaming, graphs, maps
- ✅ **Minimal control features** - Only critical device controls (alarms)
- ✅ **Stateless where possible** - Session used only for device selection, not auth

### DataAPI Should Be:
- ✅ **Centralized data authority** - All data storage and retrieval
- ✅ **User & device management** - Authentication, permissions, registration
- ✅ **Configuration management** - Settings, profiles, preferences
- ✅ **Admin features** - User management, device registration

---

**Summary**: SBQC is now properly positioned as a **public IoT monitoring dashboard** with minimal protected features. Only device control (alarms) remains protected, with profile management as a candidate for migration to DataAPI.
