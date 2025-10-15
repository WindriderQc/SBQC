const { ObjectId } = require('mongodb');

/**
 * attachUser middleware - Checks session for userId and attaches user to res.locals
 * This middleware should be applied to routes that need access to user info when logged in
 * 
 * Usage: Apply to routes that show different content when logged in
 * Example: app.use(attachUser)
 */
const attachUser = async (req, res, next) => {
    console.log(`[MIDDLEWARE] attachUser: Checking session for ${req.originalUrl} - Session ID: ${req.sessionID}`);
    res.locals.user = null;
    
    if (req.session && req.session.userId) {
        console.log(`[MIDDLEWARE] attachUser: Session found with userId: ${req.session.userId}`);
        try {
            const db = req.app.locals.db; // SBQC's database connection
            if (!db) {
                console.error(`[MIDDLEWARE] attachUser: Database connection not available.`);
                return next();
            }
            
            const usersCollection = db.collection('users');
            if (!ObjectId.isValid(req.session.userId)) {
                console.warn(`[MIDDLEWARE] attachUser: Invalid userId format in session: ${req.session.userId}`);
                return next();
            }
            
            const user = await usersCollection.findOne({ _id: new ObjectId(req.session.userId) });
            if (user) {
                console.log(`[MIDDLEWARE] attachUser: User found: ${user.name} (${user.email})`);
                // Attach user to res.locals for use in templates and routes
                res.locals.user = {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    isAdmin: user.isAdmin || false
                };
            } else {
                console.warn(`[MIDDLEWARE] attachUser: No user found for userId: ${req.session.userId}`);
            }
        } catch (err) {
            console.error(`[MIDDLEWARE] attachUser: Error fetching user: ${err.message}`);
        }
    } else {
        console.log(`[MIDDLEWARE] attachUser: No session or userId found`);
    }
    
    next();
};

/**
 * requireAuth middleware - Protects routes that require authentication
 * Redirects to login page for web requests, returns 401 for API requests
 * 
 * Usage: Apply to routes that require a logged-in user
 * Example: router.get('/admin', requireAuth, adminController.dashboard)
 */
const requireAuth = (req, res, next) => {
    console.log(`[DEBUG] requireAuth: Path: ${req.originalUrl}, Session ID: ${req.sessionID || 'none'}`);
    
    const isApiRequest = req.originalUrl && req.originalUrl.startsWith('/api');
    
    // Check if session middleware is present
    if (!req.session) {
        console.warn('[auth] req.session is undefined. Ensure express-session is applied before routes that use requireAuth.');
        if (isApiRequest) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }
        return res.redirect('/login');
    }
    
    if (!req.session.userId) {
        console.log(`[DEBUG] requireAuth: No user ID for session. Path: ${req.originalUrl}`);
        
        // For API requests, return 401 JSON
        if (isApiRequest) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }
        
        // For regular web requests, set returnTo and redirect to login
        try {
            req.session.returnTo = req.originalUrl || req.url;
        } catch (e) {
            console.warn('[auth] Failed to set returnTo on session: ' + e);
        }
        
        if (typeof req.session.save === 'function') {
            req.session.save(err => {
                if (err) {
                    console.error(`[DEBUG] requireAuth: ERROR SAVING SESSION: ${err}`);
                }
                // Redirect to DataAPI login page since that's where auth is managed
                return res.redirect('https://data.specialblend.ca/login');
            });
        } else {
            return res.redirect('https://data.specialblend.ca/login');
        }
        return; // Important: prevent further execution
    }
    
    // User is authenticated, proceed
    next();
};

/**
 * optionalAuth middleware - For public pages with enhanced features when logged in
 * Never blocks access, but attaches user if available
 * 
 * Usage: Apply to public pages that show extra content for logged-in users
 * Example: router.get('/iot', optionalAuth, iotController.dashboard)
 */
const optionalAuth = async (req, res, next) => {
    console.log(`[DEBUG] optionalAuth: Path: ${req.originalUrl}`);
    
    // Use attachUser to populate res.locals.user if session exists
    await attachUser(req, res, () => {
        // Always proceed, whether user is found or not
        next();
    });
};

/**
 * requireAdmin middleware - Protects routes that require admin privileges
 * Checks res.locals.user.isAdmin flag
 * 
 * Usage: Apply AFTER attachUser, for admin-only routes
 * Example: router.get('/admin/users', requireAuth, requireAdmin, adminController.userManagement)
 */
const requireAdmin = (req, res, next) => {
    const isApiRequest = req.originalUrl && req.originalUrl.startsWith('/api');
    
    // Check if user is attached and has admin flag
    if (res.locals.user && res.locals.user.isAdmin) {
        return next();
    }
    
    // User is not admin
    if (isApiRequest) {
        return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }
    
    return res.redirect('/');
};

module.exports = {
    attachUser,
    requireAuth,
    optionalAuth,
    requireAdmin
};
