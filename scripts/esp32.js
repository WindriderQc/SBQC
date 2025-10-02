const moment = require('moment-timezone');
const { get_io } = require('./socket');
const dataApiService = require('../services/dataApiService');

// arrays ["sender"] holding devices information
let lastComm = [];
let lastSaveTime = [];
let connectedDevices = [];
let registered = []; // This is updated by getRegisteredDevices and used locally.
const DISCONNECT_TIMOUT = 3;

let mqttclient_ = null;

const esp32 = {
    timeSince: (timeStamp, print = false, units = "seconds") => {
        const last = moment(timeStamp);
        const now = moment().tz('America/Toronto').format('YYYY-MM-DD HH:mm:ss');
        const seconds = moment(now).diff(last, units);
        if (print) console.log(now + " - " + last + " = " + seconds + " sec");
        return seconds;
    },

    setConfig: async (espID, mqttclient) => {
        try {
            const found = registered.find(element => element.id == espID);
            if (!found) {
                console.log(`Device ${espID} not found in registered list.`);
                return;
            }
            const p = await dataApiService.getProfile(found.profileName);
            console.log('Fetching profile:', found.profileName, p);
            const config = p.config;
            const c1 = JSON.stringify(config);
            const t = `esp32/${espID}/configIOs`;
            mqttclient.publish(t, c1);
        } catch (error) {
            console.error(`Error setting config for ${espID}:`, error);
        }
    },

    setAlarms: async (espID, mqttclient) => {
        try {
            const alarms = await dataApiService.setAlarms(espID);
            for (const als of alarms) {
                mqttclient.publish(`esp32/${espID}/io/sunrise`, `${als.io}:${moment(als.tStart).format('HH:mm:ss')}`);
                mqttclient.publish(`esp32/${espID}/io/nightfall`, `${als.io}:${moment(als.tStop).format('HH:mm:ss')}`);
            }
        } catch (error) {
            console.error(`Error setting alarms for ${espID}:`, error);
        }
    },

    saveEspPost: async (data) => {
        try {
            const r = await dataApiService.saveEspPost(data);
            if (r.status === 'success') {
                console.log('Success Post received from :', r.data.sender);
            } else {
                console.log("error", r.status, r.message);
            }
        } catch (err) {
            console.log(err);
        }
    },

    register: async (device) => {
        try {
            console.log("Registering:", device);
            const r = await dataApiService.registerDevice(device);
            if (r.status === 'success') {
                console.log('Welcome :', r.data.id);
                // Refresh the registered devices list
                registered = await dataApiService.getRegisteredDevices(true);
            } else {
                console.log("error registering", r.status, r.message);
            }
        } catch (err) {
            console.log('Register Error', err);
        }
    },

    receiveMessage: async (data) => {
        if (!lastComm[data.sender]) {
            console.log(`\n${data.sender} connected :)`);
            connectedDevices[data.sender] = true;
            lastSaveTime[data.sender] = 0;
        }
        lastComm[data.sender] = data;
    },

    validConnected: async () => {
        const currentRegistered = await dataApiService.getRegisteredDevices();
        if (!currentRegistered) {
            console.log('Could not retrieve device list for validation, skipping check.');
            return;
        }
        registered = currentRegistered; // Update local copy

        currentRegistered.forEach((device) => {
            if (lastComm[device.id]) {
                const last = moment(lastComm[device.id].time).format('YYYY-MM-DD HH:mm:ss');
                const seconds = esp32.timeSince(last);
                if (seconds >= DISCONNECT_TIMOUT) {
                    if (connectedDevices[device.id]) {
                        console.log(`\n${device.id} disconnected!! :(\n`);
                    }
                    connectedDevices[device.id] = false;
                    lastComm[device.id] = null;
                    mqttclient_.publish('esp32/disconnected', `{"sender":"${device.id}", "delay":"${seconds}"}`);
                } else {
                    connectedDevices[device.id] = true;
                }
            } else {
                connectedDevices[device.id] = false;
            }
        });
    },

    setConnectedValidation: (interval, mqtt_client) => {
        mqttclient_ = mqtt_client;
        setInterval(esp32.validConnected, interval);
    },

    msgHandler: async (topic, message, mqttclient) => {
        if (topic == 'esp32/register') {
            const messageStr = new TextDecoder('utf-8').decode(message);
            console.log('Topic:', topic, "  msg: ", messageStr);
            let device = { id: messageStr, lastBoot: moment().tz('America/Toronto').format('YYYY-MM-DD HH:mm:ss'), type: 'ESP32' };
            await esp32.register(device);
            return true;
        }

        if (topic == 'esp32/ioConfig') {
            const parsedMsg = JSON.parse(message);
            console.log("Topic: ", topic, "  msg: ", parsedMsg.message);
            esp32.setConfig(parsedMsg.id, mqttclient);
            return true;
        }

        if (topic.indexOf('esp32/data/') >= 0) {
            let heartbeat = JSON.parse(message);
            esp32.receiveMessage(heartbeat);
            const currentTime = Date.now();
            if (currentTime - (lastSaveTime[heartbeat.sender] || 0) >= 60000) {
                await esp32.saveEspPost(heartbeat);
                lastSaveTime[heartbeat.sender] = currentTime;
            }
            return true;
        }

        if (topic === 'sbqc/iss') {
            try {
                const issData = JSON.parse(message.toString());
                const mainServerIo = get_io();
                if (mainServerIo) {
                    mainServerIo.sockets.emit('iss', issData);
                } else {
                    console.warn('Main server IO not available to relay ISS data from MQTT.');
                }
            } catch (e) {
                console.error('Error processing ISS data from MQTT sbqc/iss:', e);
            }
            return true;
        }

        return false;
    }
};

module.exports = esp32;