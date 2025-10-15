# Authentication Setup for SBQC

This document explains how to configure SBQC to share authentication sessions with DataAPI.

## Prerequisites

1. **DataAPI must be running** and configured with:
   - MongoDB session store
   - Session secret (`SESSION_SECRET` in DataAPI's .env)
   - Session name: `data-api.sid`
   - Session database: `datas` (production) or `devdatas` (development)

2. **SBQC and DataAPI must connect to the SAME MongoDB server**

## Environment Variables

Create a `.env` file in the SBQC root directory with the following variables:

```bash
# Server Configuration
NODE_ENV=development  # or 'production'
PORT=3001

# MongoDB Connection
# CRITICAL: Use the exact same connection string as DataAPI
MONGO_CLOUD=mongodb://your-username:your-password@your-mongo-host:27017/

# Session Secret
# CRITICAL: Must match DataAPI's SESSION_SECRET EXACTLY
SESS_SECRET=your_shared_secret_here

# DataAPI URL
DATAAPI_URL=https://data.specialblend.ca
```

## How Session Sharing Works

1. **User logs in to DataAPI** at `https://data.specialblend.ca/login`
   - DataAPI validates credentials with bcrypt
   - Creates session in MongoDB `mySessions` collection
   - Sets cookie named `data-api.sid`

2. **User visits SBQC** at `http://localhost:3001`
   - SBQC reads the same `data-api.sid` cookie
   - Queries MongoDB `mySessions` collection using same store
   - Finds session and loads user information
   - User is authenticated without logging in again

3. **Both apps see the same session** because:
   - Same MongoDB server and database (`datas` or `devdatas`)
   - Same session collection (`mySessions`)
   - Same session name (`data-api.sid`)
   - Same secret key (for cookie signing)

## Configuration Checklist

### DataAPI Configuration (Reference)
- ✅ Session name: `data-api.sid`
- ✅ Session database: `config.db.mainDb` (`datas` in prod, `devdatas` in dev)
- ✅ Session collection: `mySessions`
- ✅ Session secret: `process.env.SESSION_SECRET`
- ✅ Cookie settings: `secure: IN_PROD, httpOnly: true, sameSite: 'lax'`

### SBQC Configuration (Updated)
- ✅ Session name: `'data-api.sid'` (hardcoded to match)
- ✅ Session database: Determined by `IN_PROD` flag → `datas` (prod) or `devdatas` (dev)
- ✅ Session collection: `'mySessions'`
- ✅ Session secret: `process.env.SESS_SECRET` (must match DataAPI's SESSION_SECRET)
- ✅ Cookie settings: `secure: IN_PROD, httpOnly: true, sameSite: 'lax'` (matching)

## Testing Session Sharing

1. **Start both servers:**
   ```bash
   # Terminal 1 - DataAPI
   cd /path/to/DataAPI
   npm start  # or pm2 start

   # Terminal 2 - SBQC
   cd /path/to/SBQC
   npm start
   ```

2. **Login to DataAPI:**
   - Visit `https://data.specialblend.ca/login`
   - Enter credentials
   - Verify successful login

3. **Visit SBQC:**
   - Visit `http://localhost:3001`
   - Check browser console for auth middleware logs
   - User should be automatically authenticated

4. **Verify in MongoDB:**
   ```javascript
   // In MongoDB shell or Compass
   use datas  // or devdatas if in development
   db.mySessions.find().pretty()
   // Should see session document with your userId
   ```

## Troubleshooting

### Session not shared between apps

**Check 1: MongoDB Connection**
```bash
# Both apps must connect to the SAME MongoDB server
# Compare MONGO_CLOUD in SBQC with MONGO_URL in DataAPI
```

**Check 2: Session Secret**
```bash
# Both secrets must match exactly
echo $SESS_SECRET  # in SBQC
echo $SESSION_SECRET  # in DataAPI
```

**Check 3: Database Name**
- Production: Both use `datas`
- Development: Both use `devdatas`
- Check `NODE_ENV` in both apps

**Check 4: Cookie Domain**
- For local development: Cookies work on `localhost`
- For production: May need same domain or subdomain
- Check browser DevTools → Application → Cookies

### User not recognized in SBQC

**Check: Database Connection**
```javascript
// In SBQC, verify database is set correctly
// Check app.locals.db is defined
// Ensure users collection exists
```

**Check: Middleware Order**
```javascript
// In sbqc_serv.js, ensure attachUser runs before routes
app.use(session(sessionOptions))  // Session must be first
app.use(attachUser)  // Then attach user
app.use('/api', apiRoutes)  // Then routes
```

**Check: Console Logs**
- Look for `[MIDDLEWARE] attachUser` logs
- Verify userId is found in session
- Check if user query succeeds

## Security Notes

1. **HTTPS in Production**
   - `secure: true` cookie flag requires HTTPS
   - Session sharing won't work on HTTP in production

2. **Same Secret Key**
   - Never commit `.env` files
   - Use secure secret generation: `openssl rand -hex 32`
   - Both apps must use identical secret

3. **Cookie SameSite**
   - `lax` allows cookies across same-site navigation
   - For cross-domain, you may need additional CORS config

## Next Steps

After session sharing is working:
1. Update API routes to use `requireAuth` middleware
2. Update routes to use `optionalAuth` for public pages
3. Remove old `req.session.userToken` pattern
4. Test all protected routes
