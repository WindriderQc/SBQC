const router = require('express').Router()

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


const esp32 = require('../scripts/esp32')
const getMqtt = require('../scripts/mqttServer').getClient
const Tools = require('nodetools')


// const mailman = require('../public/js/mailman'); // This line is removed as mailman is used in api.routes.js
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
        res.redirect('/index')
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
        res.redirect('/index')
    } else {
        console.log(registered.map((dev) => id = dev.id ))
        res.render('iot', { mqttinfo: mqttinfo, regDevices: registered, dataApiStatus: esp32.dataApiStatus  })
    }
})


router.get('/earth', async (req, res) => {
    res.render('earthThreeJS')
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

// API routes are now in routes/api.routes.js (This comment replaces the old TODO and the routes themselves)


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
