/**
 * Example: How to refactor SBQC to use nodetools/dataapi-auth
 * 
 * This shows the before/after comparison and migration steps.
 */

// ============================================================================
// BEFORE: Current SBQC Implementation (Custom Auth)
// ============================================================================

// sbqc_serv.js - BEFORE
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

const SESS_SECRET = process.env.SESS_SECRET;
const IN_PROD = process.env.NODE_ENV === 'production';
const SESSION_DB_NAME = IN_PROD ? 'datas' : 'devdatas';

const mongoStore = new MongoDBStore({
  uri: process.env.MONGO_CLOUD,
  databaseName: SESSION_DB_NAME,
  collection: 'mySessions'
});

const sessionOptions = {
  name: 'data-api.sid',
  secret: SESS_SECRET,
  resave: false,
  saveUninitialized: false,
  store: mongoStore,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true,
    sameSite: 'lax',
    secure: IN_PROD
  }
};

app.use(session(sessionOptions));

// Custom middleware from utils/auth.js
const { attachUser } = require('./utils/auth');
app.use(attachUser);

// ============================================================================
// AFTER: Using nodetools/dataapi-auth
// ============================================================================

// sbqc_serv.js - AFTER
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const { createAuthMiddleware, createSessionConfig } = require('nodetools').auth;

const IN_PROD = process.env.NODE_ENV === 'production';

// Create session store
const mongoStore = new MongoDBStore({
  uri: process.env.MONGO_CLOUD,
  databaseName: IN_PROD ? 'datas' : 'devdatas',
  collection: 'mySessions'
});

// Create session config using helper
const sessionConfig = createSessionConfig({
  mongoUri: process.env.MONGO_CLOUD,
  secret: process.env.SESS_SECRET,
  isProduction: IN_PROD
});

// Add the store to the config
const sessionOptions = {
  ...sessionConfig,
  store: mongoStore
};

app.use(session(sessionOptions));

// Create auth middleware
const auth = createAuthMiddleware({
  dbGetter: (req) => req.app.locals.db,
  logger: console.log  // Enable logging in development
});

// Apply to all routes
app.use(auth.attachUser);

// ============================================================================
// ROUTE EXAMPLES
// ============================================================================

// routes/routes.js - BEFORE
router.get('/iot', async (req, res) => {
  const userToken = req.session?.userToken;
  // ... custom auth logic
});

// routes/routes.js - AFTER
const { optionalAuth, requireAuth, requireAdmin } = auth;

router.get('/iot', optionalAuth, async (req, res) => {
  // res.locals.user is automatically available
  const devices = res.locals.user 
    ? await getDevicesForUser(res.locals.user._id)
    : await getPublicDevices();
  
  res.render('iot', { 
    user: res.locals.user,
    devices 
  });
});

// routes/api.routes.js - BEFORE
router.get('/devices/latest-batch', async (req, res) => {
  const userToken = req.session?.userToken;
  if (!userToken) {
    return res.status(200).json({ status: 'info', data: [] });
  }
  const latestData = await dataApiService.getLatestForAllDevices(userToken);
  res.json(latestData);
});

// routes/api.routes.js - AFTER
router.get('/devices/latest-batch', optionalAuth, async (req, res) => {
  if (!res.locals.user) {
    return res.json({ status: 'info', data: [] });
  }
  
  // No need for token - session cookie handles auth
  const latestData = await dataApiService.getLatestForAllDevices();
  res.json({ status: 'success', data: latestData });
});

// ============================================================================
// BENEFITS OF STANDARDIZATION
// ============================================================================

/**
 * 1. CONSISTENCY ACROSS PROJECTS
 * - Same auth pattern in SBQC, future projects, and any other app
 * - Same middleware names and behavior
 * - Same configuration approach
 * 
 * 2. EASIER ONBOARDING
 * - New developers learn once, apply everywhere
 * - Documentation lives in nodetools
 * - Examples are portable
 * 
 * 3. CENTRALIZED UPDATES
 * - Bug fixes in one place benefit all apps
 * - Security improvements propagate automatically
 * - Feature additions available everywhere
 * 
 * 4. LESS DUPLICATION
 * - No need to copy/paste auth code between projects
 * - Utils/auth.js can be deleted (moved to nodetools)
 * - Less maintenance burden
 * 
 * 5. TESTABILITY
 * - Auth module can have its own test suite
 * - Apps just test their route protection, not auth internals
 * - Easier to mock for testing
 */

// ============================================================================
// MIGRATION CHECKLIST FOR EXISTING PROJECTS
// ============================================================================

/**
 * Step 1: Update nodetools package
 * - Add auth/dataapi-auth.js to nodetools repo
 * - Export from main index.js
 * - Publish new version or update git reference
 * 
 * Step 2: Install updated nodetools
 * npm install github:windriderqc/nodeTools@latest
 * 
 * Step 3: Update session configuration
 * - Import createSessionConfig from nodetools
 * - Replace custom session options
 * - Keep MongoDBStore creation
 * 
 * Step 4: Replace custom auth middleware
 * - Import createAuthMiddleware from nodetools
 * - Create auth instance with dbGetter
 * - Replace attachUser with auth.attachUser
 * 
 * Step 5: Update routes
 * - Replace custom middleware with auth.requireAuth, etc.
 * - Remove token-based checks
 * - Use res.locals.user instead of req.session.userToken
 * 
 * Step 6: Update services
 * - Remove token parameters from service functions
 * - Rely on session cookies for DataAPI calls
 * 
 * Step 7: Test
 * - Login to DataAPI
 * - Verify session sharing works
 * - Test protected routes
 * - Test public routes
 * - Test admin routes
 * 
 * Step 8: Clean up
 * - Delete utils/auth.js (now in nodetools)
 * - Remove unused dependencies
 * - Update documentation
 */

// ============================================================================
// EXAMPLE: NEW PROJECT USING NODETOOLS AUTH
// ============================================================================

// server.js - NEW PROJECT
const express = require('express');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const { createAuthMiddleware, createSessionConfig } = require('nodetools').auth;

const app = express();
const IN_PROD = process.env.NODE_ENV === 'production';

// Connect to MongoDB (your existing connection logic)
const { connectDb } = require('./db');
const db = await connectDb(process.env.MONGO_CLOUD, 'myAppDb');
app.locals.db = db;

// Session setup - standardized!
const mongoStore = new MongoDBStore({
  uri: process.env.MONGO_CLOUD,
  databaseName: IN_PROD ? 'datas' : 'devdatas',
  collection: 'mySessions'
});

const sessionOptions = {
  ...createSessionConfig({
    mongoUri: process.env.MONGO_CLOUD,
    secret: process.env.SESS_SECRET,
    isProduction: IN_PROD
  }),
  store: mongoStore
};

app.use(session(sessionOptions));

// Auth setup - standardized!
const auth = createAuthMiddleware({
  dbGetter: (req) => req.app.locals.db,
  logger: IN_PROD ? null : console.log
});

app.use(auth.attachUser);

// Routes - using standard middleware
const routes = require('./routes');
app.use('/', routes(auth));

// That's it! Your new app now shares auth with DataAPI
// and uses the same patterns as all your other apps

module.exports = { app, auth };

// ============================================================================
// EXAMPLE: ROUTES IN NEW PROJECT
// ============================================================================

// routes/index.js - NEW PROJECT
module.exports = (auth) => {
  const router = require('express').Router();
  const { requireAuth, optionalAuth, requireAdmin } = auth;
  
  // Public home page
  router.get('/', optionalAuth, (req, res) => {
    res.render('home', { user: res.locals.user });
  });
  
  // Dashboard - requires login
  router.get('/dashboard', requireAuth, (req, res) => {
    res.render('dashboard', { user: res.locals.user });
  });
  
  // Admin panel - requires admin
  router.get('/admin', requireAuth, requireAdmin, (req, res) => {
    res.render('admin', { user: res.locals.user });
  });
  
  // API endpoint - optional auth
  router.get('/api/data', optionalAuth, async (req, res) => {
    const data = res.locals.user
      ? await getPrivateData(res.locals.user._id)
      : await getPublicData();
    
    res.json({ status: 'success', data });
  });
  
  return router;
};

// ============================================================================
// SUMMARY
// ============================================================================

/**
 * By moving DataAPI auth to nodetools, you get:
 * 
 * ✅ Standardized authentication across all projects
 * ✅ Drop-in solution for new applications
 * ✅ Centralized maintenance and updates
 * ✅ Consistent developer experience
 * ✅ Easier testing and debugging
 * ✅ Better documentation (lives with the code)
 * ✅ Reusable session configuration
 * ✅ Same middleware patterns everywhere
 * 
 * This is exactly what great developer tools should do:
 * Make the right thing easy and consistent!
 */
