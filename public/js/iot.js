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
    let socket = null;

    /**
     * Initializes the page, fetches data, and sets up event listeners.
     */
    async function initializePage() {
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

        connectWebSocket();

        const mqttPostButton = document.querySelector('button[onclick="mqttPost()"]');
        if (mqttPostButton) {
            mqttPostButton.onclick = publishMqttMessage;
        }
    }

    /**
     * Populates a <select> element with the list of registered devices.
     */
    function populateDeviceSelector(selectElement, devices) {
        if (!devices || devices.length === 0) {
            console.log('No registered devices to populate in the selector.');
            return;
        }
        selectElement.innerHTML = '';
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.id;
            option.textContent = device.id;
            selectElement.appendChild(option);
        });
    }

    /**
     * Populates the lists of registered devices and their last known status.
     */
    async function populateDeviceStatusList(devicesDiv, statusDiv, devices) {
        // This function can remain largely the same, as it fetches initial state via HTTP
        if (!devices || devices.length === 0) {
            devicesDiv.innerHTML = '<li>No devices found.</li>';
            return;
        }

        const deviceListUl = document.createElement('ul');
        const statusListUl = document.createElement('ul');
        devicesDiv.appendChild(deviceListUl);
        statusDiv.appendChild(statusListUl);

        // Fetching logic remains the same
        const deviceStatusMap = new Map();
        try {
            const response = await fetch('/api/devices/latest-batch');
            if (response.status === 401) {
                // User not authenticated - skip status fetch, show default message
                console.log("Not authenticated. Device status unavailable.");
            } else if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            } else {
                const latestStatuses = await response.json();
                if(latestStatuses.data) {
                    latestStatuses.data.forEach(statusWrapper => {
                        // statusWrapper is { status: 'success', data: heartbeatObject }
                        if (statusWrapper && statusWrapper.data) {
                            const heartbeat = statusWrapper.data;
                            if (heartbeat.sender && heartbeat.time) {
                                deviceStatusMap.set(heartbeat.sender, heartbeat.time);
                            }
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Failed to fetch latest device statuses:", error);
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
     * Connects to the server-side WebSocket proxy.
     */
    function connectWebSocket() {
        socket = io();

        socket.on('connect', () => {
            console.log('WebSocket connected to server proxy.');
        });

        socket.on('disconnect', () => {
            console.log('WebSocket disconnected from server proxy.');
        });

        socket.on('mqtt-message', (data) => {
            const { topic, message } = data;
            handleMqttMessage(topic, message);
        });
    }

    /**
     * Handles incoming messages forwarded from the MQTT proxy.
     */
    function handleMqttMessage(topic, payloadString) {
        const sanitizedMessage = payloadString.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        updateStreamTextArea(`${topic} : ${sanitizedMessage}`);

        const topicHandlers = {
            "alive": updateDeviceStatus,
            "data": updateDeviceStatus,
            "disconnected": handleDeviceDisconnect
        };

        for (const key in topicHandlers) {
            if (topic.includes(key)) {
                topicHandlers[key](sanitizedMessage);
                break;
            }
        }
    }

    /**
     * Updates the streaming text area with a new message.
     */
    function updateStreamTextArea(text) {
        streamTextArray.push(text);
        if (streamTextArray.length > 200) {
            streamTextArray.shift();
        }
        
        const isScrolledToBottom = streamTextArea.scrollHeight - streamTextArea.clientHeight <= streamTextArea.scrollTop + 1;
        streamTextArea.value = streamTextArray.join("\n");
        if (isScrolledToBottom) {
            streamTextArea.scrollTop = streamTextArea.scrollHeight;
        }
    }

    /**
     * Updates the UI cards with new data from a device.
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
     * Sends a command to the server via WebSocket to be published to MQTT.
     */
    function publishMqttMessage() {
        const topic = topicInput.value;
        const message = msgInput.value;
        if (!topic || !message) {
            alert('Topic and message cannot be empty.');
            return;
        }
        if (socket && socket.connected) {
            socket.emit('mqtt-command', { topic, message });
            console.log(`Sent command to server for topic ${topic}`);
        } else {
            alert('Not connected to server proxy.');
        }
    }
    
    // --- Global functions for inline event handlers ---
    window.sendSetIO = function() {
        const feedbackDiv = document.getElementById('set-io-feedback');
        const selectedDevice = devicesSelect.value;
        const ioId = document.getElementById('io_select').value;
        const ioState = document.getElementById('io_state').value;

        if (!selectedDevice) {
            alert('Please select a device.');
            return;
        }
     
        const topic = `esp32/${selectedDevice}/io/${ioState === 'ON' ? 'on' : 'off'}`;
        const msg = ioId;
        
        if (socket && socket.connected) {
            socket.emit('mqtt-command', { topic, message: msg });
            console.log(`Sent command to server for topic ${topic}`);
            
            feedbackDiv.textContent = `Command sent to ${selectedDevice}: Set IO ${ioId} to ${ioState}.`;
            feedbackDiv.className = 'alert alert-success';
            feedbackDiv.style.display = 'block';
            setTimeout(() => { feedbackDiv.style.display = 'none'; }, 4000);
        } else {
            feedbackDiv.textContent = 'Error: Not connected to server proxy.';
            feedbackDiv.className = 'alert alert-danger';
            feedbackDiv.style.display = 'block';
        }
    };

    // --- Entry Point ---
    document.addEventListener("DOMContentLoaded", initializePage);

})();