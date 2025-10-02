const jwt = require('jsonwebtoken');
const { BadRequest } = require('../utils/errors');

module.exports = function(req, res, next) {
    const token = req.header('auth-token');
    if (!token) {
        // This is a direct response, which is acceptable for a clear "unauthorized" case.
        return res.status(401).send('Access Denied');
    }

    try {
        const verified = jwt.verify(token, process.env.TOKEN_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        // For invalid token errors, we pass a structured error to the global handler.
        next(new BadRequest('Invalid Token'));
    }
}