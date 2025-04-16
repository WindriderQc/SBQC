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


function initMqtt(url, msgHandler,  channels = [])  
{
    if (mqtt_) {   console.warn("Already initialized and Trying to init MQTT again!");   return mqtt_    }

    console.log('Attempting MQTT connection...')

    let mqttclient = mqtt.connect(url, mqttOptions)


   
    mqttclient.on('error', (err) => {  console.log(err)  })

    mqttclient.on('connect', () => {  
        console.log('MQTT connected\n')

         // Subscribe to the provided list of channels
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

        //mqttclient.subscribe('esp32')
        //mqttclient.subscribe('esp32/#') //  listening to all esp32 post
    })
    
    mqttclient.on('message', async (topic, message) => {

        if(!msgHandler(topic, message, mqttclient))  consoleMsg(topic, message)      // prints all other messages to console
    })

    mqtt_ = mqttclient
    return mqtt_
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

