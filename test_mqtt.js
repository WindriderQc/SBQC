const mqtt = require('mqtt');

// Connect to the MQTT broker with increased timeout
const mqttClient = mqtt.connect('mqtt://specialblend.ca', {
    connectTimeout: 60 * 1000 // 60 seconds
});

mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    // Optionally, you can publish a test message
    mqttClient.publish('test/topic', 'Hello MQTT', (err) => {
        if (err) {
            console.error('Failed to publish message:', err);
        } else {
            console.log('Message published successfully');
        }
        // Disconnect after publishing the test message
        mqttClient.end();
    });
});

mqttClient.on('error', (err) => {
    console.error('Connection error:', err);
});

mqttClient.on('close', () => {
    console.log('Disconnected from MQTT broker');
});