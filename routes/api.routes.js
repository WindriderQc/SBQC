const router = require('express').Router();
//const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fetch = require('node-fetch');

// TLE Cache variables
let tleCache = { data: null, timestamp: 0 };
const TLE_CELESTRAK_URL = 'https://celestrak.com/NORAD/elements/stations.txt';
const TLE_CACHE_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

const moment = require('moment');
const getMqtt = require('../scripts/mqttServer').getClient;
const mailman = require('../public/js/mailman'); // For /alert route

// Environment variables
const apiUrl = process.env.DATA_API_URL + (process.env.DATA_API_PORT ? ":" + process.env.DATA_API_PORT : "");
// Note: WEATHER_API_KEY and OPENAQ_API_KEY are used directly via process.env in the /weather route

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

router.get('/proxy-location', async (req, res) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    //const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log("Client IP:", clientIp);
    const response = await fetch('https://api64.ipify.org?format=json');
    const { ip } = await response.json();
    console.log("Public IP:", ip);
    try {
        const response = await fetch(`http://ip-api.com/json/${ip}`);   //  because this is http, we use a proxy approach to make it work
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching geolocation', details: error.message });
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
    res.status(200).send("Alert processed");

})




router.get('/deviceLatest/:esp',  async (req, res) =>
{
    let option = {
        method: 'GET',
        headers: {
            'auth-token': req.session.userToken // Assumes session middleware is active
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
        console.error(err);
        res.status(500).json({ status: "error", message: "Error retrieving latest device data." });
    }
})

router.post('/saveProfile', async (req, res) => {
    const { profileName, config } = req.body;

    const profileData = {
        profileName,
        config
    };

    const option = {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'auth-token': req.session.userToken // Assumes session middleware is active
        },
        body: JSON.stringify(profileData)
    };

    try {
        const response = await fetch(apiUrl + "/profile/" + profileData.profileName, option);
        const result = await response.json();

        if (response.ok) {
            res.send('Profile saved successfully!');
        } else {
            console.error('Error saving profile:', result);
            res.status(response.status).send('Error saving profile: ' + result.message);
        }
    } catch (err) {
        console.error('Error connecting to Data API:', err);
        res.status(500).send('Error connecting to Data API: ' + err.message);
    }
});


router.get('/data/:options',  async (req, res) =>
{
    const options = req.params.options.split(',')
    const samplingRatio = options[0]
    const espID = options[1]
    const dateFrom = options[2]
    const ratio = Number(samplingRatio)
    console.log({ ratio, espID, dateFrom })

    if (req.session) { // Assumes session middleware is active
        req.session.selectedDevice = espID;
    }


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

// Route to serve TLE data (will include caching logic in a subsequent step)
router.get('/tle', async (req, res) => {
    const now = Date.now();
    if (now - tleCache.timestamp < TLE_CACHE_DURATION_MS && tleCache.data) {
        console.log('Serving TLE data from cache.');
        return res.type('text/plain').send(tleCache.data);
    }

    console.log('Fetching new TLE data from Celestrak.');
    try {
        const response = await fetch(TLE_CELESTRAK_URL);
        if (!response.ok) {
            console.error(`Failed to fetch TLE data from Celestrak: ${response.status}`);
            return res.status(response.status).json({ error: 'Failed to fetch TLE data from Celestrak' });
        }
        const data = await response.text();
        tleCache = { data, timestamp: Date.now() };
        console.log('Updated TLE cache.');
        res.type('text/plain').send(data);
    } catch (error) {
        console.error('Error fetching TLE data:', error);
        // If fetch fails, and we have stale cache, we could optionally serve it.
        // For now, just sending an error.
        res.status(500).json({ error: 'Unable to fetch TLE data' });
    }
});

module.exports = router;
