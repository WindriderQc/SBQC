require('dotenv/config');
const { validateEnv } = require('./utils/envValidator');
const { initializeErrorHandling, startServer } = require('./utils/serverUtils');

validateEnv();
initializeErrorHandling();

const express = require('express'),
    session = require('express-session'),
    MongoDBStore = require('connect-mongodb-session')(session),
    serveIndex = require('serve-index'),
    path = require('path'),
    cors = require('cors'),
    { GeneralError } = require('./utils/errors')
    //rateLimit = require('express-rate-limit'),
    //mongoose = require('mongoose'),


    
const app = express()
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')


const PORT = process.env.PORT  || 3001
const IN_PROD = process.env.NODE_ENV === 'production'  // for https channel...  IN_PROD will be true if in production environment    If true while on http connection, session cookie will not work


if (process.env.NODE_ENV !== 'test') {
    const syncRepos = require("./scripts/syncRepos");
    // Run repo sync in the background (non-blocking)
    setImmediate(() => {
      console.log("Starting repo sync in background...");
      syncRepos();
    });


    //  MQTT API to communication with ESP32 and other devices
    const mqtt = require('./scripts/mqttServer')
    const esp32 = require('./scripts/esp32')

    // This will be initialized later, after the server is created
    const socketio = require('./scripts/socket');

    //  MQTT API to communication with ESP32 and other devices
    // Pass a function that gets the Socket.IO instance from the socket module
    mqtt.initMqtt('mqtt://specialblend.ca', esp32.msgHandler, ['esp32', 'esp32/#', 'sbqc/iss'], () => socketio.get_io());
    esp32.setConnectedValidation(30000, mqtt.getClient()) //  check every X seconds if devices are still connected

}



const MONGO_CLOUD = process.env.MONGO_CLOUD;

const { log } = require('./scripts/logger')
const counter = require('./scripts/visitorCount')
const esp32 = require('./scripts/esp32.js')

const SESS_SECRET = process.env.SESS_SECRET
const SESS_LIFETIME = 1000 * 60 * 60 * 24 // Session timeout 24h (matches DataAPI)

// Determine which database to use for sessions (match DataAPI's config)
const SESSION_DB_NAME = IN_PROD ? 'datas' : 'devdatas';

const  mongoStore = new MongoDBStore({
  //uri: 'mongodb://localhost:27017/connect_mongodb_session_test',  //
   uri: MONGO_CLOUD,
   databaseName: SESSION_DB_NAME, // Use same database as DataAPI for session sharing
   collection: 'mySessions'
})

mongoStore.on('error', (error) => console.log('MongoStore Error: ', error) );

const sessionOptions = {
  name: 'data-api.sid', // Use same session name as DataAPI for session sharing
  resave: false, // Changed to false (matches DataAPI best practice)
  saveUninitialized: false,
  secret: SESS_SECRET,
  store: mongoStore,
  cookie: {      
    maxAge: SESS_LIFETIME,
    httpOnly: true, // Added for security
    sameSite: 'lax', // Changed to 'lax' (matches DataAPI)
    secure: IN_PROD  
  }// Please note that secure: true is a recommended option. However, it requires an https-enabled website, i.e., HTTPS is necessary for secure cookies. If secure is set, and you access your site over HTTP, the cookie will not be set.
}
/*
if(IN_PROD)  //  Required only when not served by nginx...  DEV Purpose
{
const https = require('https');
const fs = require('fs');

const options = {
    key: fs.readFileSync('./selfsigned.key'),
    cert: fs.readFileSync('./selfsigned.crt')
  };

  https.createServer(options, app).listen(443, () => {
    console.log('Server is running on https://ugnode.local');
  });
}
*/

// Databases
const { connectDb, loadCollections } = require('./scripts/database');

// Custom authentication middleware that fetches users from DataAPI
const auth = require('./scripts/authMiddleware');

(async () => {
    try {
        const db = await connectDb(process.env.MONGO_CLOUD, 'SBQC');
        await loadCollections(db, app);
    } catch (err) {
        console.error("Failed to connect to the database or load collections:", err);
        process.exit(1); // Exit if DB connection fails
    }
})();





//Middlewares  & routes

app
  .use(cors({ origin: '*', optionsSuccessStatus: 200 }))
  .use(express.urlencoded({ extended: true, limit: '10mb' }))  //  Must be before  'app.use(express.json)'    , 10Mb to allow image to be sent
  .use(express.json({ limit:'10mb' })) // To parse the incoming requests with JSON payloads
  //.use(rateLimit({ windowMs: 2 * 1000, max: 1 }))  // useful for api to prevent too many requests...
  .use(session(sessionOptions))
  .use(auth.attachUser) // Attach user to res.locals from session (fetches from DataAPI)
  .use(express.static(path.resolve(__dirname, 'public') , { maxAge: 1000*60*60 })) // maxAge allow client to cache data for 1h
  .use('/api',      require('./routes/api.routes')) // New API routes
  .use('/api/live-cloud-map', require('./routes/liveCloudMap.routes'))
  .use('/',         require('./routes/routes'))
  .use('/checkins', require('./routes/checkins.routes'))
  .use('/meows',    require("./routes/meows.routes"))
  .use('/login',    require('./routes/login.routes'))
  .use('/ec-data',  require('./routes/ecWeather.routes')) // Environment Canada Data Endpoint
  .use('/Projects', serveIndex(path.resolve(__dirname, 'public/Projects'), {  'icons': true,  'stylesheet': 'public/css/indexStyles.css' }))// use serve index to nav folder  (Attention si utiliser sur le public folder, la racine (/) du site sera index au lieu de html

// Global error handler should be last
app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof GeneralError) {
        const responseJson = { status: 'error', message: err.message };
        if (err.errors) {
            responseJson.errors = err.errors;
        }
        return res.status(err.getCode()).json(responseJson);
    }

    console.error(err.stack);

    return res.status(500).json({ status: 'error', message: 'An internal server error occurred.' });
});


// Start server only if the script is run directly

if (require.main === module) {
   startServer(app);
}


//console.log('Launching automation scripts')
//require('./scripts/serverScripts.js')  // generate infos/index.html

module.exports = app;

