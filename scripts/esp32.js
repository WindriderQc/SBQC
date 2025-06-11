const moment = require('moment-timezone')
const tools = require('nodetools')
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { get_io } = require('./socket');

//  TODO:     l<apiURL et le check devrait etre plus generic....
const dataAPIUrl =process.env.DATA_API_URL + (process.env.DATA_API_PORT ? ":" + process.env.DATA_API_PORT : "") //let dAPIUrl = "https://data.specialblend.ca"

let dataApiStatus = false
// Check if Data API is online


tools.checkApi("Data API", dataAPIUrl).then((status) => {
    dataApiStatus = status
    console.log('Status', status, 'Check complete\n' );
}).catch((error) => {
    console.error('Error checking API:', error);
});




  // arrays ["sender"] holding devices information
let lastComm = []
let lastSaveTime = []; 
let connectedDevices = []
let registered = []
const DB_SAVE_RATIO = 60
const BUFF_MAXSIZE = 125
const DISCONNECT_TIMOUT = 3

let mqttclient_ = null



const esp32 = {

    dataApiStatus: dataApiStatus,

    timeSince: (timeStamp, print=false, units="seconds") => 
    {   
        const last = moment(timeStamp)
        const now = moment().tz('America/Toronto').format('YYYY-MM-DD HH:mm:ss');  // align format and timeZone wth timeStamp so .diff can work
        
        const seconds = moment(now).diff(last, units)  //  difference between now and last timeStamp returned in the selected units  default=seconds

        if(print) console.log(now + " - " + last + " = " + seconds + " sec")  

        return seconds
    },
    
// seeks the config in the DB and send it to the esp32
    setConfig: async (espID, mqttclient) => 
    {
        const found = registered.find(element => element.id == espID);
        const res = await fetch(dataAPIUrl + '/profile/' + found.profileName) 
        const p = await res.json()
        console.log('Fetching profile: ' , found.profileName, p)

        const config = p.config   
        console.log('Retreving config from DB for: ' + espID + '\nConfig: ' + config)
        const c1 =  JSON.stringify(config)
        //console.log('Sending config to esp: ', espID, 'config: ', c1)

        const t = 'esp32/' + espID + '/configIOs'
        mqttclient.publish(t, c1 )
    },


    setAlarms: async(espID, mqttclient) => 
    {
        const rawResponse = await fetch(dataAPIUrl + '/alarms/' + espID);   
        const alarms = await rawResponse.json()
        for( als of alarms) {
            mqttclient.publish('esp32/' + espID + '/io/sunrise', "" + als.io + ":" + moment(als.tStart).format('HH:mm:ss'))
            mqttclient.publish('esp32/' + espID + '/io/nightfall',"" + als.io + ":" + moment(als.tStop).format('HH:mm:ss'))
        }
    },


    saveEspPost: async (data) =>
    {
        const option = { method: 'POST', headers: { "Content-type": "application/json" }, body: JSON.stringify(data)    }
    
        try {
           // console.log('Saving post: ', data, "path:", dataAPIUrl + '/heartbeats')
            const rawResponse = await fetch(dataAPIUrl + '/heartbeats', option);  
             //const r = await rawResponse.text()
            const r = await rawResponse.json()
            //console.log('savePostResponse', r)
            //console.log('status', r.status)
            if(r.status === 'success')  {  console.log('Success Post received from :', r.data.sender)  } else console.log("error", r.status, r.message ) 
        }
        catch (err) { console.log(err) }
    },


    register: async (device) =>
    {     
        try {
            console.log("Registering:", device)
            const rawResponse = await fetch(  dataAPIUrl + '/device/' + device.id, { method: 'PATCH', headers: { "Content-type": "application/json" }, body: JSON.stringify( device)    }) // body: JSON.stringify( { 'id': device.id, 'lastBoot': device.lastBoot , 'profileName': device.profileName, 'type': device.type, 'zone': device.zone })    })
            
            if (!rawResponse.ok) { throw new Error(`HTTP error! status: ${rawResponse.status}`);    }

            const r = await rawResponse.json() //const r = await rawResponse.text()
           
            if(r.status === 'success')  console.log('Welcome : ', r.data.id)  
            else                        console.log("error registering", r.status, r.message )
          



            //const devProfile = r.data; 
            //const profile = await devProfile.json()
            console.log("Get registered profile:\n", r.data)

            registered = await esp32.getRegistered()  //  actualize registered global variable
            //console.log('Registered', registered, '\n')

           
        }
        catch (err) { console.log('Register Error', err) }
    },


    getRegistered: async () =>
    {    

        try {  
            const rawResponse = await fetch(dataAPIUrl + '/devices'); 
            const r = await rawResponse.json() // const r = await rawResponse.text()
           
            if(r.status === 'success')  {} 
            else                        console.log("error", r.status, r.message) 
            
            registered = r.data

            return registered
        }
        catch (err) { console.log('Error fetching registered esp32. Is Data API online?', err); }
    },


    getDevice: async (id) =>
        {    
    
            try {  
                const rawResponse = await fetch(dataAPIUrl + '/device/' + id);
                if (!rawResponse.ok) { throw new Error(`HTTP error! status: ${rawResponse.status}`);    }
                console.log('Get device response', rawResponse) 
                const r = await rawResponse.json() // const r = await rawResponse.text()
               
                if(r.status === 'success')  {} 
                else                        console.log("error", r.status, r.message) 
                
                registered = r.data
    
                return registered
            }
            catch (err) { console.log('Error fetching registered esp32. Is Data API online?', err); }
        },
    


    receiveMessage: async (data) =>
    {
        if(lastComm[data.sender])  {    
            lastComm[data.sender] = data
        }
        else {    
            //  First message received for this sender
            console.log('\n' + data.sender + ' connected  :)' )
            connectedDevices[data.sender] = true 
            lastComm[data.sender] = data
            lastSaveTime[data.sender] = 0
        }
    },


    validConnected: async () => 
    {
        await esp32.getRegistered() 

        registered.forEach((device) => {
            if(lastComm[device.id]) {   
                
                const last = moment(lastComm[device.id].time).format('YYYY-MM-DD HH:mm:ss');
                const seconds = esp32.timeSince(last);

                if(seconds >= DISCONNECT_TIMOUT) {   //  device in commBuff but not posted since timeout delay
                    if (connectedDevices[device.id] === true) console.log('\n' + device.id + ' disconnected!!  :(\n')  
                    connectedDevices[device.id] = false  
                    lastComm[device.id] = null 
                    mqttclient_.publish('esp32/disconnected' , '{"sender":"'+device.id+'", "delay":"'+ seconds +'"}' )
                } 
                else connectedDevices[device.id] = true //  device in commBuff posted lately
            }
            else connectedDevices[device.id] = false   //   device not in commBuff
        })
    },


    setConnectedValidation: (interval, mqtt_client) => 
    {     
        mqttclient_ = mqtt_client
        setInterval(esp32.validConnected, interval)    
    },




    /*****************************
     * 
     *  MQTT Message handling
     * 
     *****************************/
    msgHandler: async (topic, message, mqttclient) =>
    {/*    {  status: , message: 'Welcome to SBQC Data API  💻 🖱️ 🦾 ', id: 'ESP_XXXX ',  data: {  }   }  */
         
        if (topic == 'esp32/register') //  message is an arrayBuffer and contains ESP_ID
        {
              // Convert ArrayBuffer to string
            const decoder = new TextDecoder('utf-8');
            const messageStr = decoder.decode(message);
            console.log('Topic:', topic, "  msg: ", messageStr )



            
            let device = { id: messageStr, lastBoot: moment().tz('America/Toronto').format('YYYY-MM-DD HH:mm:ss'),  type: 'ESP32' }
            await esp32.register(device)
            return true
        }
        else if (topic == 'esp32/ioConfig') 
        {
            const parsedMsg =  JSON.parse(message);
            console.log("Topic: ", topic, "  msg: ", parsedMsg.message )
            
            esp32.setConfig(parsedMsg.id, mqttclient)
            // await esp32.setAlarms(message, mqttclient)   //  TODO:  valider pkoi ca marche ici direct avec le buffer sans conversion string
            return true
        }
        else if (topic == 'esp32/sensors') 
        {
            let msg = message.toString()
            let data = JSON.parse(msg)
            console.log('Sensor data', data)
            if(data.action_type == 'btnBlue'  && data.value == '1') {   //  {"device":"ESP_15605", "io":"BLUE", "action_type":"btnBlue", "value": "1"}
            // waterburst();  //  TODO :    a rendre solide...   architecture de merde...
            }
            return true
        }
        else if (topic.indexOf('esp32/alive/') >= 0) 
        { 
            let heartbeat = JSON.parse(message)//  console.log("Message: ", heartbeat)
            
            await esp32.receiveMessage(heartbeat)
            return true
        }
        else if (topic.indexOf('esp32/data/') >= 0) 
        { 
            let heartbeat = JSON.parse(message)
            //console.log("Message: ", heartbeat)
          
            esp32.receiveMessage(heartbeat)
            const currentTime = Date.now(); // Get the current timestamp in milliseconds
            //console.log('Data received from: ', heartbeat.sender, '  -  ', heartbeat, currentTime - lastSaveTime[heartbeat.sender] )
          
            if (currentTime - lastSaveTime[heartbeat.sender] >= 20000) { // Check if 20 seconds have passed
                await esp32.saveEspPost(heartbeat);
                lastSaveTime[heartbeat.sender] = currentTime; // Update the last save time
            }

            return true
        }
        else if (topic === 'sbqc/iss') {   //  TODO     //  should be moved to mqttServer.js
            try {
                const issData = JSON.parse(message.toString());
                //console.log('Received ISS data from MQTT topic sbqc/iss:', issData);
                const mainServerIo = get_io();
                if (mainServerIo) {
                    mainServerIo.sockets.emit('iss', issData); // 'iss' is the event earth.ejs listens for
                    //console.log('Relayed ISS data to local Socket.IO clients.');
                } else {
                    console.warn('Main server IO not available to relay ISS data from MQTT.');
                }
            } catch (e) {
                console.error('Error processing ISS data from MQTT sbqc/iss:', e);
            }
            return true; // Indicate that the message was handled
        }
        else { return false }  // did not handle the message
    }
}


module.exports = esp32
//module.exports = {commBuff, registered}



 // IO Configuration
  // ESP32 HUZZAH32
 
  // *** Note :
  //           you can only read analog inputs on ADC #1 once WiFi has started *** //
  //           PWM is possible on every GPIO pin
  
  //DigitalInput _A0( 26, "A0");  // A0 DAC2 ADC#2 not available when using wifi 
  //DigitalInput _A1( 25, "A1");  // A1 DAC1 ADC#2 not available when using wifi
/*   AnalogInput  _A2( 34, "GAZ");  // A2      ADC#1   Note it is not an output-capable pin! 
  AnalogInput  _A3( 39, "LIGHT");  // A3      ADC#1   Note it is not an output-capable pin! 
  AnalogInput  _A4( 36, "SOIL1");  // A4      ADC#1   Note it is not an output-capable pin! 
  DigitalInput _A5(  4, "HEAT1");  // A5      ADC#2  TOUCH0 
  DigitalInput _SCK( 5, "FAN1");  // SPI SCK
  DigitalInput _MOSI( 18, "PUMP1");   // MOSI
  DigitalInput _MISO( 19, "PUMP2");  // MISO
  // GPIO 16 - RX
  // GPIO 17 - TX
  PullupInput _D21( 21, "BLUE"); 
  // 23		            BMP280	            SDA
  // 22		            BMP280	            SCL
  DigitalInput _A6( 14, "DHT");  // A6 ADC#2
  // 32		                                A7 can also be used to connect a 32 KHz crystal
  DigitalInput _A8( 15, "MOVE"); // 15		A8 ADC#2
  // 33		             	                A9
  // 27		            	                A10 ADC#2
  // 12	            	          	        A11 ADC#2 This pin has a pull-down resistor built into it, we recommend using it as an output only, or making sure that the pull-down is not affected during boot
  DigitalOutput _A12( 13, "LED1");  // A12  ADC#2  Builtin LED
  AnalogInput  _A13( 35, "VBAT");   // A13 This is general purpose input #35 and also an analog input, which is a resistor divider connected to the VBAT line   Voltage is divided by 2 so multiply the analogRead by 2
  */




