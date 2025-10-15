# Quick Start: NodeTools Auth in New Projects

## Installation

```bash
npm install github:windriderqc/nodeTools
```

## Basic Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install express express-session connect-mongodb-session mongodb
```

### 2. Configure Environment Variables
```env
# .env file
MONGO_CLOUD=mongodb://...your-connection-string
SESS_SECRET=your-very-secret-key-matches-dataapi
NODE_ENV=development
```

### 3. Server Setup
```javascript
const express = require('express');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const nodetools = require('nodetools');

const app = express();
const IN_PROD = process.env.NODE_ENV === 'production';

// Create MongoDB session store
const mongoStore = new MongoDBStore({
  uri: process.env.MONGO_CLOUD,
  databaseName: IN_PROD ? 'datas' : 'devdatas',
  collection: 'mySessions'
});

// Create auth middleware
const auth = nodetools.auth.createAuthMiddleware({
  dbGetter: (req) => req.app.locals.db,
  loginRedirectUrl: 'https://data.specialblend.ca/login',
  logger: IN_PROD ? null : console.log  // Debug logs in dev only
});

// Configure session (MUST match DataAPI)
app.use(session({
  name: 'data-api.sid',
  secret: process.env.SESS_SECRET,
  resave: false,
  saveUninitialized: false,
  store: mongoStore,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    httpOnly: true,
    sameSite: 'lax',
    secure: IN_PROD
  }
}));

// Attach user to all requests
app.use(auth.attachUser);

// Now use auth middleware in routes!
```

### 4. Using Auth in Routes

```javascript
// Public route - no auth required
app.get('/', (req, res) => {
  // res.locals.user will be null or user object
  const userName = res.locals.user ? res.locals.user.name : 'Guest';
  res.send(`Hello, ${userName}!`);
});

// Protected route - requires login
app.get('/dashboard', auth.requireAuth, (req, res) => {
  // User is guaranteed to be logged in here
  res.send(`Welcome to your dashboard, ${res.locals.user.name}!`);
});

// Admin only route
app.get('/admin', auth.requireAuth, auth.requireAdmin, (req, res) => {
  // User is logged in AND has isAdmin=true
  res.send('Admin panel');
});

// Optional auth - enhanced features when logged in
app.get('/iot', auth.optionalAuth, (req, res) => {
  if (res.locals.user) {
    // Show personalized data
  } else {
    // Show public data
  }
});
```

## API Routes Example

```javascript
const router = express.Router();
const auth = require('../auth'); // Get auth instance from main setup

// Public API endpoint
router.get('/public/data', async (req, res) => {
  const data = await getPublicData();
  res.json(data);
});

// Protected API endpoint
router.get('/user/profile', auth.requireAuth, async (req, res) => {
  const userId = res.locals.user._id;
  const profile = await getUserProfile(userId);
  res.json(profile);
});

// Admin API endpoint
router.post('/admin/users', auth.requireAuth, auth.requireAdmin, async (req, res) => {
  // Admin-only operation
  const result = await createUser(req.body);
  res.json(result);
});
```

## Database Setup

```javascript
const { MongoClient } = require('mongodb');

async function connectDb(uri, dbName) {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  
  // Make database available to auth middleware
  app.locals.db = db;
  
  return db;
}

// Call during startup
(async () => {
  try {
    await connectDb(process.env.MONGO_CLOUD, 'myAppDb');
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
})();
```

## Templates (EJS)

```ejs
<!-- views/header.ejs -->
<nav>
  <% if (user) { %>
    <p>Welcome, <%= user.name %>!</p>
    <a href="https://data.specialblend.ca/logout">Logout</a>
  <% } else { %>
    <a href="https://data.specialblend.ca/login">Login</a>
  <% } %>
</nav>
```

## Advanced Configuration

```javascript
const auth = nodetools.auth.createAuthMiddleware({
  // Required: How to get database from request
  dbGetter: (req) => req.app.locals.db,
  
  // Optional: Custom login URL
  loginRedirectUrl: 'https://myauth.com/login',
  
  // Optional: Custom users collection name
  usersCollection: 'users',
  
  // Optional: Enable logging
  logger: console.log
});
```

## Testing

```javascript
const request = require('supertest');
const app = require('./app');

describe('Auth Routes', () => {
  it('should allow public access', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
  });
  
  it('should block unauthenticated users from protected routes', async () => {
    const res = await request(app).get('/dashboard');
    expect(res.status).toBe(302); // Redirect to login
  });
});
```

## Complete Example Project Structure

```
my-app/
├── .env
├── package.json
├── server.js
├── routes/
│   ├── index.js
│   ├── api.js
│   └── admin.js
├── views/
│   ├── home.ejs
│   └── dashboard.ejs
└── public/
    └── css/
```

## Troubleshooting

### Sessions not working?
1. Check `SESS_SECRET` matches DataAPI
2. Verify session database name is correct (`datas` in production, `devdatas` in dev)
3. Ensure `name: 'data-api.sid'` is set

### User not attached?
1. Check console logs (enable with `logger: console.log`)
2. Verify `app.locals.db` is set correctly
3. Confirm user exists in database with matching `_id`

### Authentication not required?
1. Make sure `app.use(auth.attachUser)` comes BEFORE routes
2. Use `auth.requireAuth` middleware on protected routes
3. Check that session middleware is configured

---

**That's it!** You now have DataAPI-compatible authentication in any Node.js app in under 5 minutes! 🚀
