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
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    console.log('All required environment variables are set.');
};

module.exports = { validateEnv };