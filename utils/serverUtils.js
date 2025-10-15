const socketio = require('../scripts/socket');

/**
 * Starts the Express server and handles common startup errors.
 * @param {object} app - The Express application instance.
 * @returns {object} The HTTP server instance.
 */
function startServer(app) {
    const PORT = process.env.PORT || 3001;
    const IN_PROD = process.env.NODE_ENV === 'production';

    const server = app.listen(PORT, () => {
        console.log('\n__________________________________________________\n\n');
        console.log(`\n\nServer running in ${IN_PROD ? "Production" : "Development"} mode on port ${PORT}`);
        console.log('Press Ctrl + C to exit\n\n__________________________________________________\n\n');
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`🔴 FATAL ERROR: Port ${PORT} is already in use.`);
            console.error(`Please stop the process running on this port or specify a different one.`);
            process.exit(1);
        } else {
            console.error('🔴 FATAL ERROR: Server failed to start.', err);
            process.exit(1);
        }
    });

    // Initialize socket.io as it depends on the server instance
    if (process.env.NODE_ENV !== 'test') {
        socketio.init(server);
    }


    return server;
}

/**
 * Initializes global error handlers for uncaught exceptions and unhandled rejections.
 */
function initializeErrorHandling() {
    process.on('unhandledRejection', (reason, promise) => {
        console.error('🔴 Unhandled Rejection at:', promise, 'reason:', reason);
        // Application specific logging, throwing an error, or other logic here
    });

    process.on('uncaughtException', (error) => {
        console.error('🔴 Uncaught Exception:', error);
        // It's recommended to exit the process gracefully.
        // process.exit(1);
    });
}

module.exports = { startServer, initializeErrorHandling };