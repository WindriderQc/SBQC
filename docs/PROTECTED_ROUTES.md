# SBQC - Protected Routes & Authentication Requirements

**Last Updated**: October 15, 2025  
**Project**: SBQC (SpecialBlend Quality Control)

## Overview

This document lists all routes in the SBQC application and their authentication requirements.

---

## 🔒 PROTECTED ROUTES (Require Login)

These routes **require authentication**. Users will be redirected to `/login` if not authenticated.

### Page Routes

| Route | Purpose | Middleware | Access |
|-------|---------|------------|--------|
| **`/settings`** | User settings, device management, alarm configuration | `auth.requireAuth` | Logged-in users only |

**Usage Example**:
```javascript
router.get('/settings', auth.requireAuth, async (req, res, next) => {
    // User is guaranteed to be authenticated here
    // res.locals.user contains: { _id, name, email, isAdmin }
    const devices = await dataApiService.getRegisteredDevices();
    res.render('settings', { devices, user: res.locals.user });
});
```

### API Routes (Protected)

| Route | Method | Purpose | Middleware | Access |
|-------|--------|---------|------------|--------|
| **`/api/deviceLatest/:esp`** | GET | Get latest data for specific ESP device | `auth.requireAuth` | Logged-in users only |
| **`/api/saveProfile`** | POST | Save device configuration profile | `auth.requireAuth` | Logged-in users only |
| **`/api/data/:options`** | GET | Get historical device data | `auth.requireAuth` | Logged-in users only |
| **`/alarms/setAlarm`** | POST | Create/update device alarm | `auth.requireAuth` | Logged-in users only |

**Usage Example**:
```javascript
router.get('/api/deviceLatest/:esp', auth.requireAuth, async (req, res) => {
    // Only authenticated users can access
    const data = await dataApiService.getDeviceLatest(req.params.esp);
    res.json({ status: 'success', data });
});
```

---

## 🌐 PUBLIC ROUTES WITH OPTIONAL AUTHENTICATION

These routes are **accessible to everyone** but provide enhanced features when logged in.

### API Routes (Optional Auth)

| Route | Method | Purpose | Middleware | Behavior |
|-------|--------|---------|------------|----------|
| **`/api/devices/latest-batch`** | GET | Get latest data for all devices | `auth.optionalAuth` | Returns user's devices if logged in, empty array otherwise |

**Usage Example**:
```javascript
router.get('/api/devices/latest-batch', auth.optionalAuth, async (req, res, next) => {
    // Check if user is authenticated via res.locals.user
    if (!res.locals.user) {
        // Not authenticated - return empty data
        return res.json({ status: 'info', message: 'Login to see your devices', data: [] });
    }
    
    // Authenticated - return user's devices
    const data = await dataApiService.getLatestForAllDevices();
    res.json({ status: 'success', data });
});
```

---

## 🌍 PUBLIC ROUTES (No Authentication Required)

These routes are **fully public** and accessible to everyone without login.

### Main Page Routes

| Route | Purpose | Authentication | Features |
|-------|---------|----------------|----------|
| **`/`** | Home/welcome page | None | Visitor counter, request logging |
| **`/index`** | Alternative home page | None | Static content |
| **`/dashboard`** | Dashboard overview | None | Shows registered devices (public view) |
| **`/iot`** | IoT device monitoring dashboard | None | MQTT streaming, device list, real-time data |
| **`/device`** | Individual device view | None | Device details, alarms, controls |
| **`/graphs`** | Data visualization graphs | None | Historical charts, device selection |
| **`/database`** | Database browser/explorer | None | View collection structure |

### Static Content Routes

| Route | Purpose |
|-------|---------|
| **`/empty`** | Empty template page |
| **`/cams`** | Camera/video feeds |
| **`/earth`** | Earth visualization (2D) |
| **`/earthmap`** | Earth map view |
| **`/natureCode`** | Nature of Code demos |
| **`/tools`** | Development tools |
| **`/legacy`** | Legacy features |
| **`/live`** | Live streaming/monitoring |
| **`/specs`** | System specifications |
| **`/threejs-scene`** | Three.js 3D scene |
| **`/colorfinder`** | Color picker tool |
| **`/technotes`** | Technical notes |
| **`/serverspec`** | Server specifications |
| **`/iss-detector`** | ISS (International Space Station) tracker |

### Public API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| **`/api/weather`** | GET | Weather data from Environment Canada |
| **`/api/tides`** | GET | Tide information |
| **`/api/geolocation`** | GET | Geolocation services |
| **`/api/pressure`** | GET | Atmospheric pressure data |
| **`/api/iss`** | GET | ISS location/tracking data |
| **`/v2/logs`** | GET | Get user/system logs |
| **`/v2/logs`** | POST | Create log entry |

### Action Routes

| Route | Method | Purpose | Authentication |
|-------|--------|---------|----------------|
| **`/set_io`** | POST | Control device IO pins | None (public control) |
| **`/selectDevice`** | POST | Store device selection in session | None |

---

## 🔑 AUTHENTICATION & LOGIN ROUTES

| Route | Method | Purpose |
|-------|--------|---------|
| **`/login`** | GET | Display login form |
| **`/login`** | POST | Process login credentials |
| **`/login/register`** | GET | Display registration form |
| **`/login/register`** | POST | Process new user registration |
| **`/login/out`** | GET | Logout (clear session) |

---

## 📊 SUMMARY STATISTICS

### By Authentication Level

| Level | Page Routes | API Routes | Total |
|-------|-------------|------------|-------|
| **Protected (requireAuth)** | 1 | 4 | 5 |
| **Optional Auth** | 0 | 1 | 1 |
| **Public** | 21+ | 7+ | 28+ |

### Protected Routes Breakdown

**Total Protected Endpoints**: 5

1. **Page Route**: `/settings` (user settings & device management)
2. **API Route**: `/api/deviceLatest/:esp` (device data)
3. **API Route**: `/api/saveProfile` (save configuration)
4. **API Route**: `/api/data/:options` (historical data)
5. **Action Route**: `/alarms/setAlarm` (alarm management)

---

## 🔐 AUTHENTICATION MECHANISM

### How Authentication Works

```
User Login → POST /login
    ↓
Credentials validated against DataAPI users collection
    ↓
Session created in MongoDB
    - req.session.userId = user._id
    - req.session.email = user.email
    ↓
Cookie 'data-api.sid' set in browser
    ↓
Subsequent requests include cookie
    ↓
auth.attachUser middleware (runs on every request)
    - Reads req.session.userId
    - Queries MongoDB users collection
    - Sets res.locals.user = { _id, name, email, isAdmin }
    ↓
auth.requireAuth middleware (route-specific)
    - Checks if res.locals.user exists
    - If yes: Allow access
    - If no: Redirect to /login (pages) or 401 (API)
```

### User Object Structure

When authenticated, `res.locals.user` contains:

```javascript
{
    _id: ObjectId("..."),     // MongoDB user ID
    name: "John Doe",         // User's name
    email: "john@example.com", // User's email
    isAdmin: false            // Admin flag
}
```

---

## 🚦 ROUTE PROTECTION PATTERNS

### Pattern 1: Require Authentication

Use for routes that should **only** be accessible to logged-in users:

```javascript
router.get('/protected-route', auth.requireAuth, (req, res) => {
    // res.locals.user is guaranteed to exist here
    res.render('protected-page', { user: res.locals.user });
});
```

### Pattern 2: Optional Authentication

Use for routes that are **public** but offer enhanced features when logged in:

```javascript
router.get('/public-route', auth.optionalAuth, (req, res) => {
    if (res.locals.user) {
        // Show enhanced version for logged-in users
        const personalData = await getDataForUser(res.locals.user._id);
        res.render('page', { data: personalData, user: res.locals.user });
    } else {
        // Show basic version for anonymous users
        res.render('page', { data: [], user: null });
    }
});
```

### Pattern 3: No Authentication

Use for truly public routes:

```javascript
router.get('/public-route', (req, res) => {
    // Anyone can access
    res.render('public-page');
});
```

---

## 🛡️ SECURITY CONSIDERATIONS

### Why So Few Protected Routes?

SBQC is primarily an **IoT monitoring dashboard** designed for:
- **Public access** to device data and visualizations
- **Real-time MQTT** streaming (open to network users)
- **Collaborative monitoring** (multiple users watching same devices)

Only **configuration and management** features require authentication:
- Changing device settings (profiles)
- Creating/modifying alarms
- User management

### Session Security

- **Session Cookie**: `data-api.sid`
- **Storage**: MongoDB (shared with DataAPI)
- **Lifetime**: 24 hours
- **Security Flags**:
  - `httpOnly: true` (prevents XSS access)
  - `sameSite: 'lax'` (CSRF protection)
  - `secure: true` (production HTTPS only)

### MQTT Security

MQTT WebSocket authentication uses **short-lived JWT tokens**:

```javascript
const mqttToken = jwt.sign(
    { sessionId: req.session.id }, 
    process.env.TOKEN_SECRET, 
    { expiresIn: '1h' }
);
```

Tokens expire after 1 hour and are regenerated on page load.

---

## 📝 NOTES

### Adding New Protected Routes

When adding a new route that requires authentication:

1. **Import the auth middleware** (if not already):
   ```javascript
   const nodetools = require('nodetools');
   const auth = nodetools.auth.createAuthMiddleware({...});
   ```

2. **Apply the middleware**:
   ```javascript
   router.get('/new-protected-route', auth.requireAuth, handler);
   ```

3. **Access user data**:
   ```javascript
   function handler(req, res) {
       const userId = res.locals.user._id;
       const userName = res.locals.user.name;
       // ... your logic
   }
   ```

### Testing Authentication

**Test Protected Route**:
```bash
# Without login - should redirect to /login
curl -L http://localhost:3001/settings

# With login - should show settings page
# (login via browser first, then use cookie)
```

**Check Session**:
```bash
# Open browser DevTools → Application → Cookies
# Look for 'data-api.sid' cookie
# Value should be present after login
```

---

## 🔗 RELATED DOCUMENTATION

- **`docs/AUTHENTICATION_GUIDE.md`** - Complete authentication guide
- **`docs/AUTH_QUICK_START.md`** - Quick start for login
- **`docs/PHASE2_AUTH_MIGRATION_COMPLETE.md`** - Migration details
- **`.github/copilot-instructions.md`** - Development guidelines

---

**Questions?** Contact the development team or check the documentation.
