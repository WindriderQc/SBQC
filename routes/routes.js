const router = require('express').Router()

// Dynamic import for node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

//const fetch = require('node-fetch')
const mailman = require('../public/js/mailman')
let counter = require('../scripts/visitorCount')

const sysmon = new (require('../scripts/systemMonitor'))()
console.log("SysInfo: ", sysmon.getinfo().data)
console.log("CPU: ", sysmon.getinfo().cpus.length)

//const apiUrl = process.env.DATA_API_IP
const apiUrl = "https://" + (process.env.NODE_ENV === 'production' ? "localhost" : "sbqc.specialblend.ca")
console.log('API url: ' + apiUrl)




let liveDatas = require('../scripts/liveData.js')




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

// free routes

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

router.get('/dashboard', async (req, res) => {
   
    res.render('dashboard', { menuId: 'home', hitCount: await counter.getCount(), collectionInfo: req.app.locals.collectionInfo/*, mqttUrl: mqttUrl*/ })
})

router.get("/iGrow", (req, res) => {
    res.send('Hello')
})

//const liveData = require('liveData')
router.get('/earth', (req, res) => {
    res.render('earth', { liveData: liveDatas.datas, mqttUrl: process.env.DATA_API_IP })  //  TODO pkoi ca prends pas le meme url que mqttviewer?
})

router.get('/natureCode', (req, res) => {
    res.render('natureCode')
})

router.get('/tools', (req, res) => {
    res.render('tools', { sysInfo: sysmon.getinfo() })
})

router.get('/legacy', (req, res) => {
    res.render('legacy', { weatherAPI: process.env.WEATHER_API_KEY, apiUrl: apiUrl })
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
        console.log('Sensor:', sensor[0])

        const sensor_url = `https://api.openaq.org/v3/sensors/${sensor[0].sensor.id}`;
        const sensor_response = await fetch(sensor_url, {
            headers: {
                'X-API-Key': process.env.OPENAQ_API_KEY
            }
        });
        console.log(`Sensor:/${sensor[0].sensor.id}`, sensor_response)

        const data = {
            weather: weather,
            air_quality: sensor_response
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


router.get('/v2/logs', getUserLogs)
router.post('/v2/logs', createUserLog)






module.exports = router;