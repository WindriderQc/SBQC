const router = require('express').Router()

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


const esp32 = require('../scripts/esp32')
const getMqtt = require('../scripts/mqttServer').getClient
const Tools = require('nodetools')


const mailman = require('../public/js/mailman')
let counter = require('../scripts/visitorCount')
const sysmon = new (require('../scripts/systemMonitor'))()
console.log("SysInfo: ", sysmon.getinfo().data)
console.log("CPU: ", sysmon.getinfo().cpus.length)

const apiUrl =process.env.DATA_API_URL + (process.env.DATA_API_PORT ? ":" + process.env.DATA_API_PORT : "") //let dAPIUrl = "https://data.specialblend.ca"
//const apiUrl = "http://" + process.env.DATA_API_IP + ":" + process.env.DATA_API_PORT
//const mqttUrl = "ws://" + process.env.DATA_API_URL + ":" + process.env.MQTT_PORT 
const mqttWSUrl = process.env.MQTT_SERVER_WS
const mqttinfo = JSON.stringify({url: mqttWSUrl, user: process.env.USER, pass: process.env.PASS })




//  User/System logs manipulation functions


const getUserLogs = async (req, res, next) => {
    // let skip = Number(req.query.skip) || 0
    // let limit = Number(req.query.limit) || 10
    let { skip = 0,  sort = 'desc', source = 'userLogs' } = req.query
    skip = parseInt(skip) || 0
    

    skip = skip < 0 ? 0 : skip;
   
    const logsdb =  req.app.locals.collections[source]
    console.log('Getting logs from DB namespace', logsdb.namespace)

    Promise.all([
        logsdb.countDocuments(),
        logsdb.find({}, { skip, sort: {  created: sort === 'desc' ? -1 : 1     } }).toArray()
    ])
    .then(([ total, logs ]) => {
        res.json({
        logs,
        meta: { total, skip, source, has_more: 0, } })
    })
    .catch(next)
}


const createUserLog = async (req, res, next) => {
    if (req.body) {
        const log = req.body
        log.created =  new Date()
        console.log(log)
        const logsdb =  req.app.locals.collections.userLogs;
    try{
        const createdLog = await logsdb.insertOne(log)
        console.log(
        `UserLog document was inserted with the _id: ${createdLog.insertedId}`,
        )
        res.json(createdLog)
    }
    catch(err) {console.log(err); next() }
        
    } else {
        res.status(422)
        res.json({
        message: 'Hey! Invalid log....'
        })
    }
}


function requestLog(req) {

    //  TODO: send dans BD ces infos pour un checkin log de qui vient sur root /
    let client = req.headers['user-agent'];        
    let content = req.headers['Content-Type'];     
    let authorize = req.headers['Authorization'];   
    let origin = req.headers['host'];              
    let ip = req.socket.remoteAddress;     

    let queryParams = req.query; // Query parameters
    let path = req.path; // Path of the request URL
    let method = req.method; // HTTP method
    let protocol = req.protocol; // Protocol (HTTP or HTTPS)
    let hostname = req.hostname; // Hostname of the request
    let originalUrl = req.originalUrl; // Original URL of the request
    let cookies = req.cookies; // Cookies sent by the client (if any)   const cookieParser = require('cookie-parser');      app.use(cookieParser());

    
    const log = {
        logType: 'checkin',
        client: client ? client.toString().trim() : 'none',
        content: content ? content.toString().trim() : 'none',
        authorization: authorize ? authorize.toString().trim() : 'none',
        host: origin ? origin.toString().trim() : 'none',
        ip: ip ? ip.toString().trim() : 'none',
        hitCount: counter.getCount(),
        created: new Date(),
        queryParams: queryParams ? JSON.stringify(queryParams) : 'none',
        path: path ? path.toString().trim() : 'none',
        method: method ? method.toString().trim() : 'none',
        protocol: protocol ? protocol.toString().trim() : 'none',
        hostname: hostname ? hostname.toString().trim() : 'none',
        originalUrl: originalUrl ? originalUrl.toString().trim() : 'none',
        cookies: cookies ? JSON.stringify(cookies) : 'none'
    }

    return log
}








////   free routes

router.get("/", async (req, res) => {
   

    let count = await counter.increaseCount()

    const log = requestLog(req)
      
    const logsdb =  req.app.locals.collections.server;
        
    try{
        const createdLog = await logsdb.insertOne(log)
        console.log(`Log document was inserted with the _id: ${createdLog.insertedId}`)
    }
    catch(err) {console.log(err); next() }


    //res.render('index', { menuId: 'home', hitCount: count, localUrl: req.protocol + '://' + req.get('host') })
    res.render('index', { menuId: 'home', hitCount: count, requestLog: log, isWelcomePage: true  })
})

router.get('/index', async (req, res) => {
    const log = requestLog(req)
    res.render('index', { menuId: 'home', hitCount: await counter.getCount(), requestLog: log, isWelcomePage: false  })
})


router.get("/iGrow", (req, res) => {  res.send('Hello')  })

router.get('/empty', (req, res) => {  res.render('empty') })

router.get('/cams',  (req, res) => {  res.render('cams')  })


router.get('/dashboard', async (req, res) => {
    console.log('Getting registered Esp32')
    const registered = await esp32.getRegistered()
    if(registered == null) { 
        console.log('Could not fetch devices list. Is DataAPI online?') 
        res.render('index',    { name: req.session.email }) 
    } else {
        console.log(registered.map((dev) => id = dev.id ))
        res.render('dashboard', { title: "Dashboard", menuId: 'home', hitCount: await counter.getCount(), collectionInfo: req.app.locals.collectionInfo, regDevices: registered })
    } 
    
})


router.get('/iot',  async (req, res) => 
{ 
    console.log('Getting registered Esp32')
    const registered = await esp32.getRegistered()
    if(registered == null) { 
        console.log('Could not fetch devices list. Is DataAPI online?') 
        res.render('index',    { name: req.session.email }) 
    } else {
        console.log(registered.map((dev) => id = dev.id ))
        res.render('iot', { mqttinfo: mqttinfo, regDevices: registered, dataApiStatus: esp32.dataApiStatus  })
    } 
})

    
router.get('/earth', async (req, res) => {   
    res.render('earth')  
})

router.get('/natureCode', (req, res) => {
    res.render('natureCode')
})

router.get('/tools', (req, res) => {
    res.render('tools', { sysInfo: sysmon.getinfo() })
})

router.get('/legacy', (req, res) => {
    res.render('legacy', { weatherAPI: process.env.WEATHER_API_KEY })
})

router.get('/live', (req, res) => {
    res.render('live', { alertEmail: process.env.ALERT_EMAIL ? process.env.ALERT_EMAIL : "enter_your@email.com" })
})

router.get('/empty', (req, res) => {
    res.render('empty')
})


router.get('/specs', (req, res) => {
    res.render('specs')
})

//Tools
router.get('/colorfinder', (req,res) => {
    res.render('colorfinder')
})
router.get('/technotes', (req,res) => {
    res.render('technotes')
})
router.get('/serverspec', (req,res) => {
    res.render('serverspec')
})




router.get('/device',  async (req, res) => 
{
    try{
        const registered = await esp32.getRegistered()  
        if(!registered.length) {
            console.log('No devices registered yet!!!!! Cannot display device page, redirecting....')
            res.redirect('/iot')
        } else {
            let selectedDevice = req.session.selectedDevice ? req.session.selectedDevice : registered[0].id  //  default on 1st device if none is saved in session
            selectedDevice = req.query.deviceID ? req.query.deviceID : selectedDevice // selection from query superceed saved session
            console.log('Fetching Alarms for: ' + selectedDevice)
        
            const response2 = await fetch(apiUrl + "/alarms")
            const alarmList = await response2.json()
    
            let selDevice
            registered.forEach(device =>{ if(device.id == selectedDevice) {  selDevice = device }  })
            console.log('Selected Device:', selDevice.id, selDevice.config[0])
    
            res.render('device', { mqttinfo: mqttinfo, devices: registered, device: selDevice, alarmList: alarmList, apiUrl: apiUrl, iGrowUrl: req.protocol + '://' + req.get('host')  })
        }  
    } catch(err) {
            res.render('error', { mqttinfo: mqttinfo, devices: devices, selected: selectedDevice, device: selDevice, alarmList: alarmList, apiUrl: apiUrl, iGrowUrl: req.protocol + '://' + req.get('host')  })
    }
})



router.get('/graphs',  async (req, res) => 
{ 
    const response = await fetch(apiUrl + "/devices")
    const result = await response.json()
    const list = result.data
    let selectedDevice = req.session.selectedDevice ? req.session.selectedDevice : list[0].id  // req.query.deviceID ? req.query.deviceID : list[0]  
    console.log('loading graf: ', selectedDevice )
    

    const registered = await esp32.getRegistered()
    const devices = { list, registered }

    res.render('graphs',{ mqttinfo: mqttinfo, devices: devices, selected: selectedDevice, apiUrl: apiUrl })
})



router.post('/selectDevice', async (req, res) => 
{
    req.session.selectedDevice = req.body.selected
    console.log('Receiving selection: ' , req.body.selected)
    req.session.save(async (err) => { 
        if(err) console.log('Session error: ', err)
       // console.log(req.session)
        res.redirect('/graphs')
    })
})



router.get('/database',  async (req, res) =>
 {
    const response = await fetch(apiUrl+'/db/collectionList')
    const list = await response.json()
    console.log('Sending collection list to client: ', list)
    res.render('database', {collectionList: JSON.stringify(list), apiUrl: apiUrl })
})




//  Session validation & logged in routes    -  User will have a saved Session if logged in

const hasSessionID = (req, res, next) => 
{
    console.log('Session: ', req.session)
    if (!req.session.userToken) {
        res.redirect('/login')
    } else {
        next()
    }
}



router.get('/settings',  hasSessionID,  async (req, res) => 
{
    const response = await fetch(apiUrl + "/users")
    const result = await response.json()
    const users = result.data

    const response2 = await fetch(apiUrl + "/devices")
    const result2 = await response2.json()
    const devices = result2.data

    const response3 = await fetch(apiUrl + "/alarms")
    const result3 = await response3.json()
    const alarms = result3.data

    res.render('settings', {users: users, devices: devices, alarms: alarms})  
})











//  API extra   --   TODO:  doit surement etre dans des routes séparées

router.get('/weather/:latlon', async (req, res) => {

    const [lat, lon] = req.params.latlon.split(',');
   const weatherURL = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&APPID=${process.env.WEATHER_API_KEY}`;
  
    const aq_url = `https://api.openaq.org/v3/locations?coordinates=${lat},${lon}&radius=5000`;

    console.log(lat, lon);

    try {
        const weather_response = await fetch(weatherURL);
       // console.log(weather_response)
        if (!weather_response.ok) {
            throw new Error(`Failed to fetch weather data: ${weather_response.statusText}`);
        }
        const weather = await weather_response.json();
        console.log('Weather data:', weather);

        const aq_response = await fetch(aq_url, {
            headers: {
                'X-API-Key': process.env.OPENAQ_API_KEY
            }
        });
        if (!aq_response.ok) {
            const errorText = await aq_response.text();
            throw new Error(`Failed to fetch air quality data: ${aq_response.statusText} - ${errorText}`);
        }
        const aq_data = await aq_response.json();
        //console.log(aq_data);

        const sensor =  aq_data.results
        if (Array.isArray(sensor)) {
            sensor.sort((a, b) => new Date(b.datetimeLast) - new Date(a.datetimeLast));
        }

        const sensorAQ = sensor[0]
        console.log('Sensor:', sensorAQ.id)

        const sensor_url = `https://api.openaq.org/v3/sensors/${sensorAQ.id}`;
        const sensor_response = await fetch(sensor_url, {
            headers: {
                'X-API-Key': process.env.OPENAQ_API_KEY
            }
        });
        const sensor_data = await sensor_response.json();
        console.log('Sensor data:', sensor_data)

        const data = {
            weather: weather,
            air_quality: sensor_data
        };
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch weather or air quality data' });
    }
});


router.post('/alert', async (req, res) => {

    console.log('post to Alert:')
    //console.log(req.body)
   // let dat = JSON.stringify(req.body)
   // console.log(dat)

    const alert = req.body
    const dest = alert.dest
    const msg = alert.msg
    const image64 = alert.image64
    console.log(dest, msg);
    
    mailman.sendEmail(dest, msg, image64)
   
})




router.get('/deviceLatest/:esp',  async (req, res) => 
{
    let option = {
        method: 'GET',
        headers: {
            'auth-token': req.session.userToken
        }
    }

    try {
        const response = await fetch(apiUrl + "/heartbeats/senderLatest/" + req.params.esp, option)
        const respData = await response.json()
        const data = respData.data[0]
        //console.log(data)

        if (!data) {
            res.json({ status: "error", message: 'Could not get data, no latest post', data: null  })
            //return res.status(400).send(message);
        }
        else {

           /* let now =  new moment()
            let stamp =  new moment(data.time).format('YYYY-MM-DD HH:mm:ss') 
            let duration = new moment.duration(now.diff(stamp)).asHours();
     
            data.lastConnect = duration

            if(data.wifi != -100) {
                 if(duration > 0.05)  
                 {
                    console.log('Device disconnected !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
                    data.wifi   = -100
                    delete data._id
                    let dat = JSON.stringify(data)
                    console.log(dat)
                    let mq = getMqtt()
                    mq.publish('esp32/alive/'+req.params.esp, dat)  //  server sends a mqtt post on behalf of esp to log a last wifi -100 signal in db.
                 }
             }*/

            res.json({ status: "success", message: "Latest post retreived", data: data  })
        }
    }
    catch (err) {
        console.error(err)
    }
})



router.get('/data/:options',  async (req, res) => 
{
    const options = req.params.options.split(',')
    const samplingRatio = options[0]
    const espID = options[1]
    const dateFrom = options[2]
    const ratio = Number(samplingRatio)
    console.log({ ratio, espID, dateFrom })


    req.session.selectedDevice = espID

    let option = { method: 'GET', headers: { 'auth-token': req.session.userToken  }    }

    try {
        const response = await fetch(apiUrl + "/heartbeats/data/" + samplingRatio + "," + espID + ',' + dateFrom, option)
        const respData = await response.json()
        const data = respData.data
        res.json(data)
    }
    catch (err) {
        console.error(err)
        return res.status(400).send("Could not get data");
    }
})



router.post('/set_io', (req, res) => 
{
    let msg = 'esp32/' + req.body.sender + '/io/' + req.body.io_id + '/' + (req.body.io_state === 'ON' ? 'on' : 'off')
    console.log('Setting IO: ' + msg)
    let mq = getMqtt()
    mq.publish(msg, moment().format('YYYY-MM-DD HH:mm:ss'))

  //  res.redirect("/ioCard.html?io_id=" + req.body.io_id + "&name_id=" + req.body.name_id)
    res.redirect('/iot')
})



router.route('/alarms/setAlarm').post(async (req, res) => 
{ 
    console.log('post received: Set_alarm')
    //console.log(JSON.stringify(req.body))

    let als = {}
    als.espID =   req.body.device_id //'ESP_35030'  //  'ESP_15605'    ESP_35030
    als.io = req.body.io_id
    als.tStart = req.body.tStart //moment(req.body.tStart).format('YYYY-MM-DD HH:MM:SS')
    als.tStop = req.body.tStop 

    let option = {
        method: 'POST',
        headers: {
            'auth-token': req.session.userToken ,
            'Content-type': 'application/json'   
        },
        body: JSON.stringify(als)
    }
    try {
        const response = await fetch( apiUrl + "/alarms", option)
        const data = await response.json()
     
        if (Tools.isObjEmpty(data)) {
            const message = "Error saving alarm";
            console.log(message)
            //return res.status(400).send(message);
        }
        else {  //  send new alarm to already connected ESP.  Non connected ESP will receive the alarm at next boot.
            let mq = getMqtt()
            let topic = 'esp32/' + als.espID + '/io' 
            let startTime = moment(als.tStart).local().format('HH:mm:ss')
            let stopTime = moment(als.tStop).local().format('HH:mm:ss')
            mq.publish('esp32/' + als.espID + '/io/sunrise', als.io + ":" + startTime)
            mq.publish('esp32/' + als.espID + '/io/nightfall', als.io + ":" + stopTime)
            console.log({topic, startTime, stopTime})
        }

    }
    catch (err) {  console.error(err)   }

    req.session.selectedDevice = als.espID

    res.redirect("/device")
})











router.get('/v2/logs', getUserLogs)
router.post('/v2/logs', createUserLog)


module.exports = router;