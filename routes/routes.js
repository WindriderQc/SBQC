const router = require('express').Router()
const fetch = require('node-fetch')
const mailman = require('../public/js/mailman')
let counter = require('../scripts/visitorCount')

const sysmon = new (require('../scripts/systemMonitor'))()
console.log("SysInfo: ", sysmon.getinfo().data)
console.log("CPU: ", sysmon.getinfo().cpus.length)

//const apiUrl = process.env.NODE_ENV === 'production' ?  'https://www.specialblend.ddns.net:3001' : 'http://localhost:3001';
const apiUrl = process.env.DATA_API;
console.log('API url: ' + apiUrl)



let liveDatas = require('../scripts/liveData.js')



// free routes

router.get("/", async (req, res) => {
    let client = req.headers['user-agent']   //  TODO: send dans BD ces infos pour un checkin log de qui vient sur root /
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
    res.render('index', { menuId: 'home', hitCount: count, apiUrl: apiUrl })
})

router.get('/index', async (req, res) => {
    let count = await counter.getCount()
    res.render('index',  { menuId: 'home', hitCount: count , apiUrl: apiUrl })
})

router.get("/iGrow", (req, res) => {
    res.send('Hello')
})

//const liveData = require('liveData')
router.get('/earth', (req, res) => {
    res.render('earth', { liveData: liveDatas.datas, apiUrl: apiUrl })
})

router.get('/natureCode', (req, res) => {
    res.render('natureCode')
})

router.get('/outils', (req, res) => {
    res.render('outils', { sysInfo: sysmon.getinfo() })
})

router.get('/legacy', (req, res) => {
    res.render('legacy', { weatherAPI: process.env.WEATHER_API, apiUrl: apiUrl })
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

//  APIs

/////////////////////////////////////////////////////////////////////////////////////////////////////
const userController = require('../controllers/userController')

router.post("/users/test", async (req, res) => {
    console.log("test");
    res.header("auth-test", "yoyo").send("test good");  //  testing custom header 
    })

router.route('/users')
    .get(userController.index)
    .post(userController.new)  

router.route('/users/deleteViaEmail').post(userController.deleteViaEmailbody)    


router.route('/users/:user_id')
    .get(userController.view)
    .patch(userController.update)
    .put(userController.update)
    .delete(userController.delete)

router.route('/users/viaEmail/:email')
    .get(userController.viaEmail)
    .delete(userController.deleteViaEmail)





//  Session validation & logged in routes
const hasSessionID = (req, res, next) => {
    console.log(req.session)
    if (!req.session.userToken) {
        res.redirect('/login')
    } else {
        next()
    }
}


router.get('/fundev', hasSessionID,  (req, res) => {
    res.render('fundev', { name: req.session.email })    
})




const User = require('../models/userModel');

router.get('/settings',  hasSessionID, async (req, res) => {
    
    User.get((err, users)=> { 
        if(err) console.log(err)
        res.render('settings', {users: users})
    })

   /*try {
        const response = await fetch(apiUrl + "/users/")
        const users = await response.json()
        console.log(users)
        res.render('settings', {users: users.data})
    } 
    catch (err) {   console.log(err)    }
    */
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