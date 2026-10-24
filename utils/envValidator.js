const requiredEnvVars = [
    'MONGO_CLOUD',
    'DATA_API_URL',
    // 'DATA_API_PORT',
   // 'MQTT_PORT',
    'SESS_NAME',
    'SESS_SECRET',
    'TOKEN_SECRET'
];

const validateEnv = () => {
    if (process.env.NODE_ENV === 'test') {
        process.env.MONGO_CLOUD = process.env.MONGO_CLOUD || 'mongodb://127.0.0.1:27017/test_sbqc';
        process.env.DATA_API_URL = process.env.DATA_API_URL || 'http://127.0.0.1:59999';
        process.env.SESS_NAME = process.env.SESS_NAME || 'data-api.sid';
        process.env.SESS_SECRET = process.env.SESS_SECRET || 'test-session-secret';
        process.env.TOKEN_SECRET = process.env.TOKEN_SECRET || 'test-token-secret';
        return;
    }

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    console.log('All required environment variables are set.');
};

module.exports = { validateEnv };
