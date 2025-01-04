const router = require('express').Router()

// Dynamic import for node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

//const fetch = require('node-fetch')
const mailman = require('../public/js/mailman')
let counter = require('../scripts/visitorCount')

const sysmon = new (require('../scripts/systemMonitor'))()
console.log("SysInfo: ", sysmon.getinfo().data)
console.log("CPU: ", sysmon.getinfo().cpus.length)

//const apiUrl = process.env.NODE_ENV === 'production' ?  'https://www.specialblend.ddns.net:3001' : 'http://localhost:3001';
const apiUrl = process.env.DATA_API_IP
const mqttUrl = process.env.MQTT_IP
console.log('API url: ' + apiUrl)



let liveDatas = require('../scripts/liveData.js')



// free routes

router.get("/", async (req, res) => {
    //  TODO: send dans BD ces infos pour un checkin log de qui vient sur root /
    let client = req.headers['user-agent'];        console.log('Client: ', client)
    let content = req.headers['Content-Type'];     console.log('Content-Type: ', content)
    let autorize = req.headers['Authorization'];   console.log('Authorize:', autorize)
    let origin = req.headers['host'];              console.log('Host:', origin)
    let ip = req.socket.remoteAddress;             console.log('Client IP: ', ip)

    let count = await counter.increaseCount()
    //res.render('index', { menuId: 'home', hitCount: count, localUrl: req.protocol + '://' + req.get('host') })
    res.render('index', { menuId: 'home', hitCount: count, localUrl: 'https://' + req.get('host') })
})

router.get('/index', async (req, res) => {
    let count = await counter.getCount()
    res.render('index', { menuId: 'home', hitCount: count, localUrl: 'https://' + req.get('host') })
})

router.get("/iGrow", (req, res) => {
    res.send('Hello')
})

//const liveData = require('liveData')
router.get('/earth', (req, res) => {
    res.render('earth', { liveData: liveDatas.datas, mqttUrl: mqttUrl })
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

router.get('/cv_yanikbeaulieu', (req, res) => {
    res.render('cv')
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

    const latlon = req.params.latlon.split(',');
    const lat = latlon[0];
    const lon = latlon[1];
    const weatherURL = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&&units=metric&APPID=${process.env.WEATHER_API}`
    const aq_url = `https://api.openaq.org/v2/latest?has_geo=true&coordinates=${lat},${lon}&radius=5000&order_by=lastUpdated`   //  TODO: last updated change tjrs la structure des data car pas les meme sensors par site...  mais ca garantie des données actualisée....
    // console.log(lat, lon);
       
    const weather_response = await fetch(weatherURL);
    const weather = await weather_response.json()
  
    weather ? console.log(weather + "\n") : console.log("Get Weather error")

    const aq_response = await fetch(aq_url);
    const aq_data = await aq_response.json();
    console.log("\n\n" + aq_data)


    if(aq_data) 
        console.log(aq_data.results[aq_data.results.length -1])
    else console.log("Get AirQuality error")   

    const data = {
        weather: weather,
        air_quality: aq_data
    };
    res.json(data);


})


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





module.exports = router;