const router = require('express').Router();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const getMqtt = require('../scripts/mqttServer').getClient;
const Tools = require('nodetools');
const { BadRequest } = require('../utils/errors');
const counter = require('../scripts/visitorCount');
const sysmon = new (require('../scripts/systemMonitor'))();
const dataApiService = require('../services/dataApiService');
const jwt = require('jsonwebtoken');

// Import nodeTools auth middleware
const nodetools = require('nodetools');
const auth = nodetools.auth.createAuthMiddleware({
    dbGetter: () => require('./api.routes').getDb(),
    loginRedirectUrl: '/login',
    logger: console
});

console.log("SysInfo: ", sysmon.getinfo().data);
console.log("CPU: ", sysmon.getinfo().cpus.length);

const apiUrl = process.env.DATA_API_URL + (process.env.DATA_API_PORT ? ":" + process.env.DATA_API_PORT : "");
const mqttWSUrl = process.env.MQTT_SERVER_WS;

// MQTT connection info for templates
const mqttinfo = {
    url: mqttWSUrl,
    broker: process.env.MQTT_SERVER_URL || 'mqtt://mqtt.specialblend.ca'
};

//  User/System logs manipulation functions
const getUserLogs = async (req, res, next) => {
    try {
        let { skip = 0, sort = 'desc', source = 'userLogs' } = req.query;
        skip = parseInt(skip) || 0;
        skip = skip < 0 ? 0 : skip;

        const response = await dataApiService.getLogs({ skip, sort, source });
        
        // DataAPI should return { status, message, meta: { total, skip, source, has_more }, data }
        res.json({
            logs: response.data || [],
            meta: response.meta || { total: 0, skip, source, has_more: false }
        });
    } catch (err) {
        next(err);
    }
};

const createUserLog = async (req, res, next) => {
    try {
        if (!req.body) {
            throw new BadRequest('Invalid log data provided.');
        }
        const logData = {
            ...req.body,
            created: new Date()
        };
        
        const response = await dataApiService.createLog(logData, 'userLogs');
        console.log(`UserLog document was created via DataAPI`);
        res.json(response);
    } catch (err) {
        next(err);
    }
};

function requestLog(req) {
    return {
        logType: 'checkin',
        client: (req.headers['user-agent'] || 'none').toString().trim(),
        content: (req.headers['Content-Type'] || 'none').toString().trim(),
        authorization: (req.headers['Authorization'] || 'none').toString().trim(),
        host: (req.headers['host'] || 'none').toString().trim(),
        ip: (req.socket.remoteAddress || 'none').toString().trim(),
        hitCount: counter.getCount(),
        created: new Date(),
        queryParams: JSON.stringify(req.query) || 'none',
        path: (req.path || 'none').toString().trim(),
        method: (req.method || 'none').toString().trim(),
        protocol: (req.protocol || 'none').toString().trim(),
        hostname: (req.hostname || 'none').toString().trim(),
        originalUrl: (req.originalUrl || 'none').toString().trim(),
        cookies: JSON.stringify(req.cookies) || 'none'
    };
}

// --- Page Routes ---

router.get("/", async (req, res, next) => {
    try {
        const count = await counter.increaseCount();
        const log = requestLog(req);
        
        // Log to DataAPI asynchronously (don't wait for response)
        dataApiService.createLog(log, 'server').catch(err => 
            console.error('Failed to log to DataAPI:', err.message)
        );
        
        res.render('index', { menuId: 'home', hitCount: count, requestLog: log, isWelcomePage: true });
    } catch (err) {
        next(err);
    }
});

router.get('/index', async (req, res, next) => {
    try {
        const log = requestLog(req);
        const hitCount = await counter.getCount();
        res.render('index', { menuId: 'home', hitCount, requestLog: log, isWelcomePage: false });
    } catch (err) {
        next(err);
    }
});

router.get('/dashboard', async (req, res, next) => {
    try {
        const registered = await dataApiService.getRegisteredDevices();
        if (registered == null) {
            console.log('Could not fetch devices list for dashboard. Is DataAPI online?');
            return res.redirect('/index');
        }
        console.log('Registered devices for dashboard:', registered.map(dev => dev.id));
        const hitCount = await counter.getCount();
        res.render('dashboard', {
            title: "Dashboard",
            menuId: 'home',
            hitCount,
            collectionInfo: req.app.locals.collectionInfo,
            regDevices: registered
        });
    } catch (err) {
        next(err);
    }
});

router.get('/iot', async (req, res, next) => {
    try {
        let registered = await dataApiService.getRegisteredDevices();
        if (registered == null) {
            console.log('Could not fetch devices list for iot. Is DataAPI online?');
            registered = [];
        }
        console.log('Registered devices for iot:', registered.map(dev => dev.id));

        // Create a short-lived JWT for MQTT authentication
        const mqttToken = jwt.sign({ sessionId: req.session.id }, process.env.TOKEN_SECRET, { expiresIn: '1h' });

        res.render('iot', {
            menuId: 'iot-overview',
            mqttUrl: mqttWSUrl,
            mqttToken: mqttToken,
            regDevices: registered
        });
    } catch (err) {
        next(err);
    }
});

router.get('/device', async (req, res, next) => {
    try {
        const registered = await dataApiService.getRegisteredDevices();
        if (!registered || !registered.length) {
            console.log('No devices registered. Cannot display device page, redirecting to /iot.');
            return res.redirect('/iot');
        }

        let selectedDevice = req.query.deviceID || req.session.selectedDevice || registered[0].id;
        const selDevice = registered.find(device => device.id == selectedDevice);

        if (!selDevice) {
            console.warn(`Device ${selectedDevice} not found, redirecting to /iot.`);
            return res.redirect('/iot');
        }

        console.log('Fetching Alarms for: ' + selDevice.id);
        const response = await fetch(`${apiUrl}/api/v1/alarms`);
        const alarmList = await response.json();

        res.render('device', {
            menuId: 'iot-device',
            mqttinfo: mqttinfo,
            devices: registered,
            device: selDevice,
            alarmList: alarmList,
            apiUrl: apiUrl,
            iGrowUrl: `${req.protocol}://${req.get('host')}`
        });
    } catch (err) {
        next(err);
    }
});

router.get('/graphs', async (req, res, next) => {
    try {
        const list = await dataApiService.getRegisteredDevices();
        if (!list || list.length === 0) {
            console.log('Could not fetch devices list for /graphs or no devices registered.');
            return res.redirect('/iot');
        }
        const selectedDevice = req.session.selectedDevice || list[0].id;
        res.render('graphs', {
            menuId: 'iot-graphs',
            mqttinfo: mqttinfo,
            devices: { list, registered: list },
            selected: selectedDevice,
            apiUrl: apiUrl
        });
    } catch (err) {
        next(err);
    }
});

router.get('/mqttTest', (req, res) => {
    res.render('mqttTest', {
        menuId: 'iot-mqtt-test'
    });
});

router.post('/selectDevice', (req, res, next) => {
    req.session.selectedDevice = req.body.selected;
    console.log('Saving device selection to session: ', req.body.selected);
    req.session.save((err) => {
        if (err) return next(err);
        res.redirect('/graphs');
    });
});

router.get('/database', (req, res) => {
    const list = req.app.locals.collectionInfo;
    res.render('database', { collectionList: JSON.stringify(list), apiUrl: apiUrl });
});

// NOTE: /settings has been moved to DataAPI frontend
// Redirect to DataAPI for settings management
router.get('/settings', (req, res) => {
    res.redirect('https://data.specialblend.ca/settings');
});

// --- Simple Static Page Routes ---
const staticRoutes = ['/iGrow', '/empty', '/cams', '/earth', '/earthmap', '/natureCode', '/tools', '/legacy', '/live', '/specs', '/threejs_scene', '/colorfinder', '/technotes', '/serverspec'];
staticRoutes.forEach(route => {
    const view = route.substring(1);
    router.get(route, (req, res) => {
        const renderOptions = {};
        if (view === 'tools') renderOptions.sysInfo = sysmon.getinfo();
        if (view === 'legacy') renderOptions.weatherAPI = process.env.WEATHER_API_KEY;
        if (view === 'live') renderOptions.alertEmail = process.env.ALERT_EMAIL || "enter_your@email.com";
        if (view === 'threejs_scene') {
            renderOptions.menuId = 'threejs-scene';
            renderOptions.title = 'threejs scene';
        }
        if (view === 'iGrow') return res.send('Hello'); // Special case
        res.render(view, renderOptions);
    });
});

router.get('/iss-detector', (req, res) => {
    res.render('issDetector');
});

// --- Action Routes ---

router.post('/set_io', (req, res) => {
    const { sender, io_id, io_state } = req.body;
    const msg = `esp32/${sender}/io/${io_id}/${io_state === 'ON' ? 'on' : 'off'}`;
    console.log('Publishing to MQTT: ' + msg);
    getMqtt().publish(msg, moment().format('YYYY-MM-DD HH:mm:ss'));
    res.redirect('/iot');
});

router.post('/alarms/setAlarm', auth.requireAuth, async (req, res, next) => {
    try {
        const { device_id, io_id, tStart, tStop } = req.body;
        const als = { espID: device_id, io: io_id, tStart, tStop };

        const option = {
            method: 'POST',
            headers: {
                // Session cookies automatically sent - no need for auth-token header
                'Content-type': 'application/json'
            },
            body: JSON.stringify(als)
        };

        const response = await fetch(`${apiUrl}/api/v1/alarms`, option);
        const data = await response.json();

        if (Tools.isObjEmpty(data)) {
            throw new Error("Error saving alarm: Empty response from API.");
        }

        const mq = getMqtt();
        const startTime = moment(als.tStart).local().format('HH:mm:ss');
        const stopTime = moment(als.tStop).local().format('HH:mm:ss');
        mq.publish(`esp32/${als.espID}/io/sunrise`, `${als.io}:${startTime}`);
        mq.publish(`esp32/${als.espID}/io/nightfall`, `${als.io}:${stopTime}`);

        req.session.selectedDevice = als.espID;
        res.redirect("/device");

    } catch (err) {
        next(err);
    }
});

router.get('/v2/logs', getUserLogs);
router.post('/v2/logs', createUserLog);

module.exports = router;