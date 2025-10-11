const { fetchJSON } = require('./apiClient');

const dataAPIUrl = process.env.DATA_API_URL + (process.env.DATA_API_PORT ? ":" + process.env.DATA_API_PORT : "");

// Cache for registered devices
let deviceCache = { data: null, timestamp: 0 };
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

async function getProfile(profileName) {
    return await fetchJSON(`${dataAPIUrl}/profile/${profileName}`);
}

async function setAlarms(espID) {
    return await fetchJSON(`${dataAPIUrl}/alarms/${espID}`);
}

async function saveEspPost(data) {
    const options = {
        method: 'POST',
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(data)
    };
    return await fetchJSON(`${dataAPIUrl}/heartbeats`, options);
}

async function registerDevice(device) {
    const options = {
        method: 'PATCH',
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(device)
    };
    return await fetchJSON(`${dataAPIUrl}/device/${device.id}`, options);
}

async function getRegisteredDevices(forceRefresh = false) {
    if (!process.env.DATA_API_URL) {
        console.warn("DATA_API_URL is not defined. Cannot fetch registered devices.");
        return null;
    }
    const now = Date.now();
    if (!forceRefresh && deviceCache.data && (now - deviceCache.timestamp < CACHE_DURATION_MS)) {
        return deviceCache.data;
    }
    try {
        const result = await fetchJSON(`${dataAPIUrl}/api/v1/devices`);
        if (result && result.status === 'success') {
            deviceCache = { data: result.data, timestamp: now };
            return result.data;
        }
        return deviceCache.data || null; // Return stale cache if available on error
    } catch (error) {
        console.error("Error fetching registered devices:", error.message);
        return deviceCache.data || null; // Return stale cache on error
    }
}

async function getDevice(id) {
    return await fetchJSON(`${dataAPIUrl}/device/${id}`);
}

async function getDeviceLatest(esp, token) {
    const options = { headers: { 'auth-token': token } };
    return await fetchJSON(`${dataAPIUrl}/heartbeats/senderLatest/${esp}`, options);
}

async function saveProfile(profileName, config, token) {
    const profileData = { profileName, config };
    const options = {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'auth-token': token },
        body: JSON.stringify(profileData)
    };
    // This endpoint might not return JSON on success, so we can't use fetchJSON directly without knowing more.
    // For now, let's assume it returns JSON or handle it in the route.
    // Let's create a temporary fetch for this.
    const { fetch } = require('node-fetch');
    const response = await fetch(`${dataAPIUrl}/profile/${profileName}`, options);
    if(response.ok) return response.text();
    throw new Error(await response.text());
}

async function getDeviceData(samplingRatio, espID, dateFrom, token) {
    const options = { headers: { 'auth-token': token } };
    return await fetchJSON(`${dataAPIUrl}/heartbeats/data/${samplingRatio},${espID},${dateFrom}`, options);
}

async function getIssData() {
    return await fetchJSON(`${dataAPIUrl}/api/v1/iss`);
}

module.exports = {
    getProfile,
    setAlarms,
    saveEspPost,
    registerDevice,
    getRegisteredDevices,
    getDevice,
    getDeviceLatest,
    saveProfile,
    getDeviceData,
    getIssData,
};