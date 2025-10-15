// IIFE to encapsulate the IOT page logic
(function () {
    "use strict";

    // --- DOM Elements ---
    const streamTextArea = document.getElementById('streamTextArea');
    const devicesListDiv = document.getElementById('devicesList');
    const statusListDiv = document.getElementById('statusList');
    const devicesSelect = document.getElementById('devices_select');
    const topicInput = document.getElementById('topic');
    const msgInput = document.getElementById('msg');

    // --- State ---
    let streamTextArray = [];
    let registeredDevices = [];
    let mqttClient = null;

    /**
     * Initializes the page, fetches data, and sets up event listeners.
     */
    async function initializePage() {
        // The 'ejsData' object is created in a script tag in the EJS template
        const pageData = window.ejsData;
        if (!pageData) {
            console.error('Page data not found. Make sure ejsData is defined.');
            return;
        }

        registeredDevices = pageData.regDevices || [];
        console.log('Registered devices:', registeredDevices);

        if (devicesSelect) {
            populateDeviceSelector(devicesSelect, registeredDevices);
        }
        
        await populateDeviceStatusList(devicesListDiv, statusListDiv, registeredDevices);

        // Connect to MQTT broker
        if (pageData.mqttInfo) {
            connectMqtt(pageData.mqttInfo);
        } else {
            console.error('MQTT connection info is missing.');
        }

        // Setup event listeners
        const mqttPostButton = document.querySelector('button[onclick="mqttPost()"]');
        if (mqttPostButton) {
            mqttPostButton.onclick = publishMqttMessage; // Re-assign to avoid inline JS
        }
    }

    /**
     * Populates a <select> element with the list of registered devices.
     * @param {HTMLSelectElement} selectElement - The <select> element to populate.
     * @param {Array} devices - An array of device objects.
     */
    function populateDeviceSelector(selectElement, devices) {
        if (!devices || devices.length === 0) {
            console.log('No registered devices to populate in the selector.');
            return;
        }
        selectElement.innerHTML = ''; // Clear existing options
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.id;
            option.textContent = device.id;
            selectElement.appendChild(option);
        });
    }

    /**
     * Populates the lists of registered devices and their last known status.
     * This version fetches all statuses in one batch API call.
     * @param {HTMLElement} devicesDiv - The element to hold the device list.
     * @param {HTMLElement} statusDiv - The element to hold the status list.
     * @param {Array} devices - An array of device objects.
     */
    async function populateDeviceStatusList(devicesDiv, statusDiv, devices) {
        if (!devices || devices.length === 0) {
            devicesDiv.innerHTML = '<li>No devices found.</li>';
            return;
        }

        const deviceListUl = document.createElement('ul');
        const statusListUl = document.createElement('ul');
        devicesDiv.appendChild(deviceListUl);
        statusDiv.appendChild(statusListUl);

        // Create a map for quick lookups
        const deviceStatusMap = new Map();

        try {
            // Fetch latest statuses from the server-side batch endpoint (mounted at /api)
            const response = await fetch('/api/devices/latest-batch');
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            const latestStatuses = await response.json();
            latestStatuses.data.forEach(status => {
                deviceStatusMap.set(status.id, status.lastpost.data.time);
            });
        } catch (error) {
            console.error("Failed to fetch latest device statuses:", error);
            // Populate with a generic error message if the API fails
            devices.forEach(device => {
                deviceStatusMap.set(device.id, "Status unavailable");
            });
        }

        devices.forEach(device => {
            const deviceLi = document.createElement('li');
            deviceLi.id = `${device.id}_li`;
            deviceLi.textContent = device.id;
            deviceListUl.appendChild(deviceLi);

            const statusLi = document.createElement('li');
            statusLi.id = `${device.id}_li2`;
            statusLi.textContent = deviceStatusMap.get(device.id) || "No post in database";
            statusListUl.appendChild(statusLi);
        });
    }

    /**
     * Connects to the MQTT broker and subscribes to relevant topics.
     * @param {object} mqttInfo - Connection details for the MQTT broker.
     */
    function connectMqtt(mqttInfo) {
        // Use the connection info passed from the server
        mqttClient = mqtt.connect(mqttInfo.url, {
            rejectUnauthorized: false,
            username: mqttInfo.user,
            password: mqttInfo.pass
        });

        console.log('Attempting MQTT connect to:', mqttInfo.url);

        mqttClient.on('connect', () => {
            console.log('MQTT client connected.');
            mqttClient.publish('esp32', 'Browser client connected.');
            mqttClient.subscribe("esp32/#");
            mqttClient.subscribe("sbqc/#");
        });

        mqttClient.on('error', (err) => {
            console.error('MQTT Error:', err);
        });

        mqttClient.on('message', handleMqttMessage);
    }

    /**
     * Handles incoming MQTT messages.
     * @param {string} topic - The MQTT topic.
     * @param {Buffer} payload - The message payload.
     */
    function handleMqttMessage(topic, payload) {
        const message = payload.toString();
        updateStreamTextArea(`${topic} : ${message}`);

        const topicHandlers = {
            "alive": updateDeviceStatus,
            "data": updateDeviceStatus,
            "disconnected": handleDeviceDisconnect
        };

        for (const key in topicHandlers) {
            if (topic.includes(key)) {
                topicHandlers[key](message);
                break;
            }
        }
    }

    /**
     * Updates the streaming text area with a new message.
     * @param {string} text - The text to add.
     */
    function updateStreamTextArea(text) {
        streamTextArray.push(text);
        if (streamTextArray.length > 200) { // Keep the array from growing indefinitely
            streamTextArray.shift();
        }

        // Check if user is scrolled to the bottom before appending
        const isScrolledToBottom = streamTextArea.scrollHeight - streamTextArea.clientHeight <= streamTextArea.scrollTop + 1;
        
        streamTextArea.value = streamTextArray.join("\n");

        if (isScrolledToBottom) {
            streamTextArea.scrollTop = streamTextArea.scrollHeight;
        }
    }

    /**
     * Updates the UI cards with new data from a device.
     * @param {string} payloadString - The JSON string from the MQTT message.
     */
    function updateDeviceStatus(payloadString) {
        try {
            const data = JSON.parse(payloadString);
            const sender = data.sender;

            const updateElement = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = value;
            };
            
            if (data.wifi !== undefined) {
                updateElement(`${sender}rss_id_value_id`, data.wifi);
                updateElement(`${sender}temp_id_value_id`, data.CPUtemp);
            }
            if (data.battery !== undefined) {
                updateElement(`${sender}batt_id_value_id`, data.battery);
                updateElement(`${sender}humid_id_value_id`, data.airHumid);
            }

        } catch (err) {
            console.error("Failed to parse device status:", err, payloadString);
        }
    }

    /**
     * Handles the UI update when a device disconnects.
     * @param {string} payloadString - The JSON string from the MQTT message.
     */
    function handleDeviceDisconnect(payloadString) {
        try {
            const data = JSON.parse(payloadString);
            const sender = data.id;
            
            const updateElement = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = value;
            };

            console.log(`Device disconnected: ${sender}`);
            updateElement(`${sender}rss_id_value_id`, -100);
            updateElement(`${sender}temp_id_value_id`, 'xx');

        } catch (err) {
            console.error("Failed to parse disconnect message:", err, payloadString);
        }
    }

    /**
     * Publishes a message to the MQTT broker from the input fields.
     */
    function publishMqttMessage() {
        const topic = topicInput.value;
        const message = msgInput.value;
        if (!topic || !message) {
            alert('Topic and message cannot be empty.');
            return;
        }
        if (mqttClient && mqttClient.connected) {
            mqttClient.publish(topic, message);
            console.log(`Published to ${topic}: ${message}`);
        } else {
            alert('MQTT client is not connected.');
        }
    }
    
    // --- Global functions for inline event handlers (legacy support) ---
    window.sendSetIO = function() {
        const feedbackDiv = document.getElementById('set-io-feedback');
        const selectedDevice = devicesSelect.value;
        const ioId = document.getElementById('io_select').value;
        const ioState = document.getElementById('io_state').value; // Assuming 'ON' or 'OFF'

        if (!selectedDevice) {
            alert('Please select a device.');
            return;
        }
     
        const topic = `esp32/${selectedDevice}/io/${ioState === 'ON' ? 'on' : 'off'}`;
        const msg = ioId;
        
        if (mqttClient && mqttClient.connected) {
            mqttClient.publish(topic, msg);
            console.log(`Published to ${topic}: ${msg}`);
            
            // Provide user feedback
            feedbackDiv.textContent = `Command sent to ${selectedDevice}: Set IO ${ioId} to ${ioState}.`;
            feedbackDiv.className = 'alert alert-success';
            feedbackDiv.style.display = 'block';

            // Hide the message after a few seconds
            setTimeout(() => {
                feedbackDiv.style.display = 'none';
            }, 4000);

        } else {
            // Provide error feedback
            feedbackDiv.textContent = 'Error: MQTT client is not connected.';
            feedbackDiv.className = 'alert alert-danger';
            feedbackDiv.style.display = 'block';
        }
    };


    // --- Entry Point ---
    document.addEventListener("DOMContentLoaded", initializePage);

})();