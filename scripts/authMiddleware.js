/**
 * Custom Auth Middleware for SBQC
 * 
 * IMPORTANT: This is NOT using nodeTools auth!
 * 
 * Why custom auth?
 * - SBQC stores ALL data (including users) in DataAPI, not local MongoDB
 * - Local MongoDB is ONLY for session storage (shared with DataAPI)
 * - We need to fetch users via HTTP API calls to DataAPI, not database queries
 * - nodeTools auth expects users in local MongoDB (different architecture)
 * 
 * Architecture:
 * 1. User logs in at DataAPI (session created there)
 * 2. Session cookie is shared across domains (data.specialblend.ca + SBQC)
 * 3. This middleware reads userId from session
 * 4. Fetches full user data from DataAPI via HTTP
 * 5. Caches user data to minimize API calls
 * 
 * For projects with local user storage, use nodeTools auth instead:
 *   const nodetools = require('nodetools');
 *   const auth = nodetools.auth.createAuthMiddleware({...});
 */

const dataApiService = require('../services/dataApiService');

// In-memory cache for user data to prevent excessive API calls
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get user from cache or fetch from API
 */
async function getCachedUser(userId) {
    const now = Date.now();
    const cached = userCache.get(userId);
    
    // Return cached user if still valid
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[AUTH CACHE] Using cached user for ${userId}`);
        }
        return cached.user;
    }
    
    // Fetch from API
    const user = await dataApiService.getUserById(userId);
    
    // Cache the result (even if null to prevent repeated failed lookups)
    userCache.set(userId, {
        user,
        timestamp: now
    });
    
    // Clean up old cache entries (simple cleanup on each fetch)
    if (userCache.size > 100) { // Prevent unbounded growth
        const cutoff = now - CACHE_TTL;
        for (const [key, value] of userCache.entries()) {
            if (value.timestamp < cutoff) {
                userCache.delete(key);
            }
        }
    }
    
    return user;
}

/**
 * Clear cache for a specific user (useful after updates)
 */
function clearUserCache(userId) {
    userCache.delete(userId);
}

/**
 * Clear entire user cache
 */
function clearAllUserCache() {
    userCache.clear();
}

/**
 * Custom attachUser middleware that fetches user from DataAPI
 * 
 * Checks session for userId and loads user from DataAPI (with caching).
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
            // Fetch user from cache or DataAPI
            const user = await getCachedUser(req.session.userId);
            
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
    optionalAuth,
    clearUserCache,      // Export for manual cache invalidation
    clearAllUserCache    // Export for clearing entire cache
};
