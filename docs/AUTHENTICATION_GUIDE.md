# SBQC Authentication Guide

**Last Updated**: October 15, 2025  
**Status**: ✅ Active

## Overview

SBQC uses **session-based authentication** powered by the nodeTools auth middleware. Users authenticate once, and their session is stored in MongoDB and shared with DataAPI.

## How to Log In

### Method 1: Local Login (SBQC)

1. **Navigate to the login page**:
   ```
   http://localhost:3001/login
   ```
   Or on production:
   ```
   https://specialblend.ca/login
   ```

2. **Enter credentials**:
   - **Email**: Your registered email address
   - **Password**: Your password

3. **After successful login**:
   - Session is created in MongoDB
   - Cookie `data-api.sid` is set in your browser
   - You're redirected to `/settings`
   - `res.locals.user` is populated for all subsequent requests

### Method 2: DataAPI Login (Session Sharing)

If you have access to DataAPI:

1. **Log in to DataAPI**:
   ```
   https://data.specialblend.ca/login
   ```

2. **Access SBQC**:
   - Once logged into DataAPI, navigate to SBQC
   - Your session cookie is automatically recognized
   - You're already authenticated!

This works because both apps share:
- Same MongoDB session store (database: `datas`/`devdatas`, collection: `mySessions`)
- Same session name: `data-api.sid`
- Same session secret: `SESS_SECRET`

## How Authentication Works

### 1. Login Flow

```
User → POST /login (email, password)
       ↓
Check user exists (fetch from DataAPI's users collection)
       ↓
Verify password (bcrypt.compare)
       ↓
Create JWT token (optional, for legacy compatibility)
       ↓
Save session:
  - req.session.userId = user._id.toString()
  - req.session.email = user.email
       ↓
Redirect to /settings
```

### 2. Authenticated Request Flow

```
Browser → GET /settings (with data-api.sid cookie)
       ↓
Session Middleware (express-session)
  - Loads session from MongoDB
  - Attaches to req.session
       ↓
auth.attachUser Middleware (nodeTools)
  - Reads req.session.userId
  - Queries MongoDB users collection
  - Sets res.locals.user = { _id, name, email, isAdmin }
       ↓
auth.requireAuth Middleware (route-specific)
  - Checks if res.locals.user exists
  - If yes: Continue to route handler
  - If no: Redirect to /login
       ↓
Route Handler
  - Access user via res.locals.user
  - Render page with user context
```

### 3. Session Storage

Sessions are stored in MongoDB:

**Database**: 
- Production: `datas`
- Development: `devdatas`

**Collection**: `mySessions`

**Session Document Structure**:
```json
{
  "_id": "session-id-here",
  "expires": ISODate("2025-10-16T12:00:00Z"),
  "session": {
    "cookie": {
      "originalMaxAge": 86400000,
      "expires": "2025-10-16T12:00:00.000Z",
      "httpOnly": true,
      "path": "/"
    },
    "userId": "507f1f77bcf86cd799439011",
    "email": "user@example.com"
  }
}
```

## Protected Routes

### Page Routes

| Route | Middleware | Access Level |
|-------|-----------|--------------|
| `/settings` | `auth.requireAuth` | Logged-in users only |
| `/iot` | Public | Everyone (enhanced features when logged in) |
| `/` | Public | Everyone |

### API Routes

| Route | Middleware | Access Level |
|-------|-----------|--------------|
| `/api/deviceLatest/:esp` | `auth.requireAuth` | Logged-in users only |
| `/api/devices/latest-batch` | `auth.optionalAuth` | Public (empty data if not logged in) |
| `/api/saveProfile` | `auth.requireAuth` | Logged-in users only |
| `/api/data/:options` | `auth.requireAuth` | Logged-in users only |
| `/alarms/setAlarm` | `auth.requireAuth` | Logged-in users only |

## User Registration

To register a new user:

1. **Navigate to registration page**:
   ```
   http://localhost:3001/login/register
   ```

2. **Fill out the form**:
   - Name
   - Email
   - Password
   - Confirm Password

3. **Submit**:
   - User is created in DataAPI's users collection
   - Password is hashed with bcrypt
   - You're redirected to login

## Logout

To log out:

1. **Navigate to**:
   ```
   http://localhost:3001/login/out
   ```

2. **What happens**:
   - Session cookie is cleared
   - You're redirected to home page
   - Protected routes will require login again

## Accessing User Data in Code

### In Route Handlers

```javascript
router.get('/my-route', auth.requireAuth, (req, res) => {
    // User is guaranteed to exist here (middleware enforces it)
    const user = res.locals.user;
    
    console.log('User ID:', user._id);
    console.log('Name:', user.name);
    console.log('Email:', user.email);
    console.log('Is Admin:', user.isAdmin);
    
    res.render('my-page', { user });
});
```

### In EJS Templates

```ejs
<% if (locals.user) { %>
    <p>Welcome, <%= user.name %>!</p>
    <a href="/settings">Settings</a>
    <a href="/login/out">Logout</a>
<% } else { %>
    <a href="/login">Login</a>
<% } %>
```

### Optional Auth Pattern

For routes that work for everyone but show enhanced features when logged in:

```javascript
router.get('/dashboard', auth.optionalAuth, async (req, res) => {
    if (res.locals.user) {
        // Show personalized dashboard
        const devices = await getDevicesForUser(res.locals.user._id);
        res.render('dashboard', { devices, user: res.locals.user });
    } else {
        // Show public dashboard
        res.render('dashboard', { devices: [], user: null });
    }
});
```

## Environment Variables Required

Your `.env` file must include:

```bash
# Session Configuration (must match DataAPI)
SESS_SECRET=your-shared-secret-here
SESS_NAME=data-api.sid

# MongoDB Connection (must be same as DataAPI for session sharing)
MONGO_CLOUD=mongodb://username:password@host:27017/

# Environment (determines database name)
NODE_ENV=development  # uses 'devdatas'
# or
NODE_ENV=production   # uses 'datas'

# DataAPI Connection
DATA_API_IP=localhost
DATA_API_PORT=3003
DATA_API_URL=https://data.specialblend.ca

# JWT Token (for legacy compatibility)
TOKEN_SECRET=your-jwt-secret-here
```

## Troubleshooting

### "Access Denied" or Redirect to Login

**Problem**: Protected routes redirect to login even after logging in.

**Check**:
1. Is session cookie being set?
   - Open browser DevTools → Application → Cookies
   - Look for `data-api.sid` cookie
   
2. Is userId in session?
   - Check server logs for: `[AUTH] attachUser: Session found with userId: ...`
   
3. Is user found in database?
   - Check logs for: `[AUTH] attachUser: User found: ...`

**Solution**:
```bash
# Enable auth logging to see what's happening
# In sbqc_serv.js, the logger is already set to console
# Check terminal output when accessing protected routes
```

### Session Not Persisting

**Problem**: Login works but session expires immediately.

**Check**:
1. MongoDB connection:
   ```bash
   # Should see in logs:
   MongoDB connected to database: SBQC (for sessions only)
   ```

2. Session store errors:
   ```bash
   # Check for:
   MongoStore Error: ...
   ```

3. Cookie settings:
   - `secure: false` for development (HTTP)
   - `secure: true` for production (HTTPS)

### User Object Not Available

**Problem**: `res.locals.user` is null even after login.

**Check**:
1. Is `auth.attachUser` middleware applied globally?
   ```javascript
   // In sbqc_serv.js
   app.use(auth.attachUser) // ✅ Should be here
   ```

2. Is session userId set correctly?
   ```javascript
   // In login.routes.js
   req.session.userId = user._id.toString() // ✅ Must be string
   ```

3. Database connection:
   ```javascript
   // Check dbGetter returns valid connection
   const db = req.app.locals.db; // Should not be null
   ```

## Session Sharing with DataAPI

Both SBQC and DataAPI read/write to the same session store:

```
┌─────────────┐
│   DataAPI   │ ← Login/Register
│  (Port 3003)│   Creates session
└──────┬──────┘
       │
       ├── Writes to MongoDB: datas.mySessions
       │
       ↓
┌─────────────┐
│    SBQC     │ ← Reads session
│  (Port 3001)│   Recognizes user
└─────────────┘
```

**Important**: 
- Both apps must use **identical** `SESS_SECRET`
- Both apps must use **same** session name: `data-api.sid`
- Both apps must connect to **same** MongoDB instance
- Both apps must use **same** database name based on `NODE_ENV`

## Testing Authentication

### 1. Test Local Login

```bash
# Start SBQC
cd /home/yb/servers/SBQC
npm run dev

# Navigate to http://localhost:3001/login
# Enter credentials
# Should redirect to /settings
# Check terminal for:
# [AUTH] attachUser: User found: <name> (<email>)
```

### 2. Test Protected Route

```bash
# Without login:
curl http://localhost:3001/settings
# Should redirect to /login (302)

# With login:
# Log in via browser, then:
curl -b cookies.txt http://localhost:3001/settings
# Should return settings page (200)
```

### 3. Test Session Sharing

```bash
# 1. Start DataAPI on port 3003
# 2. Login to DataAPI
# 3. Check MongoDB for session:
mongosh
use devdatas
db.mySessions.find().pretty()

# 4. Navigate to SBQC
# 5. Should already be logged in!
# 6. Check SBQC logs:
# [AUTH] attachUser: User found: ...
```

## Security Best Practices

1. **Always use HTTPS in production**:
   ```javascript
   cookie: { secure: true } // in production
   ```

2. **Keep secrets secret**:
   - Never commit `.env` file
   - Use strong, random `SESS_SECRET`
   - Rotate secrets periodically

3. **Validate session data**:
   - nodeTools auth validates userId format
   - Checks user exists in database
   - Returns null if invalid (doesn't crash)

4. **Monitor sessions**:
   ```javascript
   // Check active sessions
   db.mySessions.count()
   
   // Find sessions older than 24h
   db.mySessions.find({ 
     expires: { $lt: new Date() }
   })
   ```

5. **Clear expired sessions**:
   MongoDB automatically removes expired sessions via TTL index on `expires` field.

## Next Steps

- [ ] Test login flow with real user account
- [ ] Verify session sharing with DataAPI
- [ ] Test all protected routes require authentication
- [ ] Test logout clears session
- [ ] Verify session persistence across server restarts

---

**Questions?** Check the main documentation or contact the development team.
