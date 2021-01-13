require('dotenv').config();
const router = require('express').Router()
const bodyParser = require('body-parser')
const fetch = require('node-fetch')

router.use(bodyParser.urlencoded({ extended: true }));


router.get("/", (req, res) => {
    res.render('index', { page: 'Home', menuId: 'home' });
})

router.get('/index', (req, res) => {
    res.render('index', { page: 'Home', menuId: 'home' })
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

router.get('/cv', (req, res) => {
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

    const options = {
        "method": "GET",
        "headers": {    "x-rapidapi-key": process.env.WEATHER_API        }
    }

    const weather_response = await fetch(`https://community-open-weather-map.p.rapidapi.com/weather?lat=${lat}&lon=${lon}&units=metric`, options);
    const weather = await weather_response.json()
    console.log(weather)

    const aq_url = `https://api.openaq.org/v1/latest?has_geo=true&coordinates=${lat},${lon}&radius=100000&order_by[]=date&order_by[]=distance`;
    const aq_response = await fetch(aq_url);
    const aq_data = await aq_response.json();

    console.log(aq_url)
    console.log(aq_data.results[aq_data.results.length -1])

    const data = {
        weather: weather,
        air_quality: aq_data
    };
    res.json(data);


})


module.exports = router;

