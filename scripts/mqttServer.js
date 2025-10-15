require('dotenv').config()

const mqtt = require('mqtt'),
 assert = require('assert'),
 mqttUser = process.env.USER,
 mqttPass = process.env.PASS


let mqtt_

const mqttOptions = {
    clientId: "mServer" + Math.random().toString(16),
    port: 1883,
    rejectUnauthorized: false,
    username: mqttUser,
    password: mqttPass, 
    clean_session: true   //  this option insure message are not stored and resend between devices deconnection
  }


let getIo;

function initMqtt(url, msgHandler, channels = [], getSocketIoInstance) {
    if (mqtt_) {
        console.warn("Already initialized and Trying to init MQTT again!");
        return mqtt_;
    }

    getIo = getSocketIoInstance; // Store the function that gets the socket.io instance

    console.log('Attempting MQTT connection...');
    const mqttclient = mqtt.connect(url, mqttOptions);

    mqttclient.on('error', (err) => {
        console.log(err);
    });

    mqttclient.on('connect', () => {
        console.log('MQTT connected\n');
        if (channels.length > 0) {
            channels.forEach(channel => {
                mqttclient.subscribe(channel, (err) => {
                    if (err) {
                        console.error(`Failed to subscribe to channel: ${channel}`, err);
                    } else {
                        console.log(`Subscribed to channel: ${channel}`);
                    }
                });
            });
        } else {
            console.warn('No channels provided for subscription.');
        }
    });

    mqttclient.on('message', async (topic, message) => {
        const io = getIo();
        // Forward every MQTT message to all connected web clients
        if (io) {
            io.sockets.emit('mqtt-message', { topic: topic, message: message.toString() });
        }

        if (!msgHandler(topic, message, mqttclient)) {
            consoleMsg(topic, message);
        }
    });

    mqtt_ = mqttclient;
    return mqtt_;
}


function consoleMsg(topic, message) 
{
    try {  
        let msg
        msg = JSON.parse(message)
        console.log('Topic: ', topic, '  msg: ', msg)
    }                                                                                            //  if not a json....   
    catch (e) {  console.log('Topic: ', topic, 'msg', message.toString(), '  --Msg is not a JSON-ConvertedToString')  }   //  then convert buffer to string       
}


function getClient() {  assert.ok(mqtt_, "Mqtt has not been initialized. Please called init first.");  return mqtt_  }


module.exports = {
    getClient,
    initMqtt, 
    consoleMsg
};

