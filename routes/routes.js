const express = require('express')
const router = express.Router()
const bodyParser = require('body-parser')
const moment = require('moment')
const fetch = require('node-fetch')
require('dotenv').config();

const mailman = require('./mailman')

router.use(bodyParser.json({ limit: '10mb', extended: true }));
router.use(bodyParser.urlencoded({ extended: true }));



const TimeDiff = (startTime, endTime, format) => {

    startTime = moment(startTime, 'YYYY-MM-DD HH:mm:ss');
    endTime = moment(endTime, 'YYYY-MM-DD HH:mm:ss');
    return endTime.diff(startTime, format);
}

function test() {
    let startTime = new Date('2019-11-18 16:37:18');
    //let endTime = new Date('2014-5-11 10:37:18');
    var now = moment().format('YYYY-MM-DD HH:mm:ss')
    console.log(TimeDiff(now, startTime, 'seconds'));
}

var t = setTimeout(test, 500);


const redirectLogin = (req, res, next) => {
    console.log(req.session)
    if (!req.session.userToken) {
        res.redirect('/login')
    } else {
        next()
    }
}
/*
router.use((req,res,netx) =>{
    const {}
})

*/





router.get("/", (req, res) => {
    res.render('index', { page: 'Home', menuId: 'home' });
})
router.get("/login", (req, res) => {
    res.render('partials/login');
})

router.get("/iGrow", (req, res) => {
    res.send('Hello')
})

router.get('/index', (req, res) => {
    res.render('index', { page: 'Home', menuId: 'home' })
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

router.get('/empty', (req, res) => {
    res.render('empty')
})

router.get('/cv', (req, res) => {
    res.render('cv')
})


router.get('/weather/:latlon', async (req, res) => {
    /* const latlon = req.params.latlon.split(',')
     const lat = latlon[0]
     const lon = latlon[1]
     const sky_url = `https://api.darksky.net/forecast/7d6708021ee4840eb38d457423ab8a9a/${lat},${lon}`
     //const sky_url = 'https://api.darksky.net/forecast/7d6708021ee4840eb38d457423ab8a9a/0,0'
                   console.log(sky_url)             
     const fetch_response = await fetch(sky_url)
     const data = await fetch_response.json() 
     //console.log(data)
     res.json(data)*/

    const latlon = req.params.latlon.split(',');
    const lat = latlon[0];
    const lon = latlon[1];
    console.log(lat, lon);
    const api_key = process.env.API_KEY;
    console.log(api_key)
    const weather_url = `https://api.darksky.net/forecast/${api_key}/${lat},${lon}/?units=si`;
    const weather_response = await fetch(weather_url);
    const weather_data = await weather_response.json();

    const aq_url = `https://api.openaq.org/v1/latest?has_geo=true&coordinates=${lat},${lon}&radius=100000&order_by=distance`;

    //const aq_url = `https://api.openaq.org/v1/latest?coordinates=0,0`;
    const aq_response = await fetch(aq_url);
    const aq_data = await aq_response.json();

    console.log(aq_url)
    console.log(aq_data)

    const data = {
        weather: weather_data,
        air_quality: aq_data
    };
    res.json(data);


})











const Datastore = require('nedb')
const picDb = new Datastore('pics.db');
picDb.loadDatabase();

router.get('/api', (request, response) => {
    picDb.find({}, (err, data) => {
        if (err) { response.end(); return; }
        response.json(data);
    });
});

router.post('/api', bodyParser.json(), (req, res) => {  //  TODO : je crois que bodyparser n'est plus requis... bug corrigé

    console.log('post to /api:')
    const data = req.body
    const timestamp = Date.now()
    data.timestamp = timestamp
    picDb.insert(data)
    res.json(data)

});

router.post('/alert', bodyParser.json(), async (req, res) => {

    console.log('post to Alert:')

    const alert = req.body
    const dest = alert.dest
    const msg = alert.msg
    const image64 = alert.image64
    //console.log(alert)

    console.log(dest, msg);

    const answer = await mailman.sendEmail(dest, msg, image64)
    console.log()

})










module.exports = router;

