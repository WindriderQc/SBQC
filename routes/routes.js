require('dotenv').config();
const express = require('express')
const router = express.Router()
const fetch = require('node-fetch')
const mailman = require('../public/js/mailman')
var counter = require('../visitorCount')


router.use(express.urlencoded({extended: true}));
router.use(express.json()) // To parse the incoming requests with JSON payloads
router.use(express.json({limit:'50mb'}));

router.get("/", async (req, res) => {
    let client = req.headers['user-agent'] 
    console.log(client)
    let content = req.headers['Content-Type'] 
    console.log(content)
    let autorize = req.headers['Authorization'] 
    console.log(autorize)

    var origin = req.headers['host'] 
    console.log(origin)
    var ip = req.socket.remoteAddress
    console.log(ip)
    let count = await counter.increaseCount()
    res.render('index', { page: 'Home', menuId: 'home', hitCount: count })
})

router.get('/index', async (req, res) => {
    let count = await counter.getCount()
    res.render('index',  { page: 'Home', menuId: 'home', hitCount: count })
})

router.get("/iGrow", (req, res) => {
    res.send('Hello')
})

router.get('/earth', (req, res) => {
    res.render('earth')
})

router.get('/natureCode', (req, res) => {
    res.render('natureCode')
})

router.get('/legacy', (req, res) => {
    res.render('legacy')
})

router.get('/live', (req, res) => {
    res.render('live')
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


router.get('/weather/:latlon', async (req, res) => {

    const latlon = req.params.latlon.split(',');
    const lat = latlon[0];
    const lon = latlon[1];
   // console.log(lat, lon);

       
    const weather_response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&&units=metric&APPID=${process.env.WEATHER_API}`);
    const weather = await weather_response.json()
    console.log(weather)
    console.log()

    
    const aq_url = `https://api.openaq.org/v2/latest?has_geo=true&coordinates=${lat},${lon}&radius=5000&order_by=lastUpdated`
    //console.log( aq_url)
    const aq_response = await fetch(aq_url);
    
    const aq_data = await aq_response.json();
    /*console.log()
    
    console.log()
    console.log(aq_data)*/


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
    console.log(req.body)
    const b = (req.body)
    console.log(b)

    const alert = req.body
    const dest = alert.dest
    const msg = alert.msg
    const image64 = alert.image64
    console.log(alert)

    console.log(dest, msg);

    const answer = await mailman.sendEmail(dest, msg, image64)
    console.log(answer)

})


module.exports = router;

