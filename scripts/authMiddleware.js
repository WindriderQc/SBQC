/**
 * Custom Auth Middleware for SBQC
 * 
 * Wraps nodeTools auth but fetches users from DataAPI instead of local database
 * since SBQC doesn't store user data locally.
 */

const dataApiService = require('../services/dataApiService');

/**
 * Custom attachUser middleware that fetches user from DataAPI
 * 
 * Checks session for userId and loads user from DataAPI.
 * Sets res.locals.user with user data or null.
 * Never blocks requests - always calls next().
 */
async function attachUser(req, res, next) {
    const path = req.originalUrl || req.path || 'unknown';
    const sessionId = req.sessionID || 'none';
    
    if (process.env.NODE_ENV === 'development') {
        console.log(`[AUTH] attachUser: Checking session for ${path} - Session ID: ${sessionId}`);
    }
    
    res.locals.user = null;
    
    if (req.session && req.session.userId) {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[AUTH] attachUser: Session found with userId: ${req.session.userId}`);
        }
        
        try {
            // Fetch user from DataAPI instead of local database
            const user = await dataApiService.getUserById(req.session.userId);
            
            if (user) {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`[AUTH] attachUser: User found: ${user.name} (${user.email})`);
                }
                
                // Attach sanitized user data to res.locals
                res.locals.user = {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    isAdmin: user.isAdmin || false
                };
            } else {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`[AUTH] attachUser: No user found for userId: ${req.session.userId}`);
                }
            }
        } catch (err) {
            console.error(`[AUTH ERROR] attachUser: ${err.message}`);
        }
    } else {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[AUTH] attachUser: No session or userId found`);
        }
    }
    
    next();
}

/**
 * Middleware to require authentication
 * Redirects to DataAPI login if not authenticated
 */
function requireAuth(req, res, next) {
    if (!res.locals.user) {
        const loginUrl = process.env.DATA_API_URL + '/login';
        return res.redirect(loginUrl);
    }
    next();
}

/**
 * Middleware to require admin role
 * Returns 403 if user is not admin
 */
function requireAdmin(req, res, next) {
    if (!res.locals.user || !res.locals.user.isAdmin) {
        return res.status(403).json({ 
            status: 'error', 
            message: 'Admin access required' 
        });
    }
    next();
}

/**
 * Optional auth middleware
 * Doesn't block if user is not authenticated
 */
function optionalAuth(req, res, next) {
    // User is already attached by attachUser middleware
    next();
}

module.exports = {
    attachUser,
    requireAuth,
    requireAdmin,
    optionalAuth
};
