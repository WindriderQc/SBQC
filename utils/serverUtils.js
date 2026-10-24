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

        const mqttEnabled = String(process.env.MQTT_ENABLED || 'true').toLowerCase() !== 'false';
        const mqttBrokerUrl = process.env.MQTT_BROKER_URL || process.env.MQTT_SERVER_URL || 'mqtt://specialblend.ca';
        const mqttTopics = (process.env.MQTT_TOPICS || 'esp32,esp32/#,sbqc/iss')
            .split(',')
            .map((topic) => topic.trim())
            .filter(Boolean);

        if (mqttEnabled && mqttBrokerUrl) {
            // Initialize MQTT after Socket.IO is ready.
            const mqtt = require('../scripts/mqttServer');
            const esp32 = require('../scripts/esp32');

            mqtt.initMqtt(
                mqttBrokerUrl,
                esp32.msgHandler,
                mqttTopics,
                () => socketio.get_io()
            );
            esp32.setConnectedValidation(30000, mqtt.getClient());
        } else {
            console.log('MQTT disabled by configuration.');
        }
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
