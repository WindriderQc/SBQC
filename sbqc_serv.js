require('dotenv/config')
const express = require('express'),
  session = require('express-session'),
  MongoDBStore = require('connect-mongodb-session')(session),
  serveIndex = require('serve-index'),
  path = require('path'),
  //mongoose = require('mongoose'),
  nodeTools = require('./scripts/nodeTools')

//rateLimit = require('express-rate-limit'),
const cors = require('cors')


const PORT = process.env.PORT  || 3001
const IN_PROD = process.env.NODE_ENV === 'production'  // for https channel...  IN_PROD will be true if in production environment    If true while on http connection, session cookie will not work
console.dir('Node Env: ', process.env.NODE_ENV)
console.log('env prod:', IN_PROD)







const app = express()
app.set('view engine', 'ejs')


const mongoStore = new MongoDBStore({  
    uri: process.env.MONGO_CLOUD,  
    collection: 'mySessions', 
    connectionOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        // serverSelectionTimeoutMS: 10000
    }
}, (err) => { if(err) console.log( 'MongoStore connect error: ', err) } );

mongoStore.on('error', (error) => console.log('MongoStore Error: ', error) );




const sessionOptions = {
  name: process.env.SESS_NAME,
  resave: false,
  saveUninitialized: true,
  secret: process.env.SESS_SECRET,
  store: mongoStore,
  cookie: {
      secure: IN_PROD, // Please note that secure: true is a recommended option. However, it requires an https-enabled website, i.e., HTTPS is necessary for secure cookies. If secure is set, and you access your site over HTTP, the cookie will not be set.
      sameSite: true
  }
}

if(!IN_PROD)  //  Required only when not served by nginx...  DEV Purpose
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


//  Databases

// mongoose with local DB
//require('./scripts/mongooseDB')



//Mongodb Client setup  with CloudDB  // TODO: used for posts book but should be uniformized to one DB.  the use of collection in app.locals seem different
const mongo = require('./scripts/mongoClientDB')

mongo.connectDb( process.env.MONGO_CLOUD, 'SBQC', async (db) =>{    // dbServ, test, admin, local 
    
    //db.createCollection('server')     TODO:  faire un test conditionnel et creer si non exist
    app.locals.collections = [] 
    const list = await mongo.getCollectionsList()

    console.log("Assigning Collections to app.locals :")
    for(coll of list) {
        console.log(coll.name)
        app.locals.collections[coll.name] =  mongo.getDb(coll.name)
    }
    
    app.locals.collections.server.insertOne({ name: "dbServer boot", date: Date.now() })   //   TODO:  Server may not exist

})







//Middlewares  & routes
app
  .use(cors({ origin: '*', optionsSuccessStatus: 200 }))
  .use(express.urlencoded({ extended: true, limit: '10mb' }))  //  Must be before  'app.use(express.json)'    , 10Mb to allow image to be sent
  .use(express.json({ limit:'10mb' })) // To parse the incoming requests with JSON payloads
  //.use(rateLimit({ windowMs: 2 * 1000, max: 1 }))  // useful for api to prevent too many requests...
  .use(session(sessionOptions))
  .use(express.static(path.resolve(__dirname, 'public') , { maxAge: 1000*60*60 })) // maxAge allow client to cache data for 1h
  .use('/',         require('./routes/routes'))
  .use('/checkins', require('./routes/checkins.routes'))
  .use('/data',     require('./routes/data.routes'))
  .use('/meows',    require("./routes/meows.routes"))
  //.use('/Tools',    serveIndex(path.resolve(__dirname, 'public/Tools'), {  'icons': true,  'stylesheet': 'public/css/indexStyles.css' } )) // use serve index to nav folder  (Attention si utiliser sur le public folder, la racine (/) du site sera index au lieu de html
  .use('/Projects', serveIndex(path.resolve(__dirname, 'public/Projects'), {  'icons': true,  'stylesheet': 'public/css/indexStyles.css' }))



app.get('/kart', (req, res) => {  res.render('./public/Projects/Kart/index.html') })



const server = app.listen(PORT, () =>{  
    console.log('\n__________________________________________________\n\n')
    console.log(`\n\nServer running in ${IN_PROD ? "Production" : "Developpement"} mode at port ${PORT}`)
    console.log(`(Nginx may change public port)`)
    console.log('Press Ctrl + C to exit\n')
    console.log('\n__________________________________________________\n\n')
    nodeTools.readFile("greetings.txt")
  })


const socket = require('./scripts/socket')
socket.init(server)


let liveDatas = require('./scripts/liveData.js')
const intervals = { quakes:1000*60*60*24*7, iss: 1000*5 }
liveDatas.init()
liveDatas.setAutoUpdate(intervals, false)
console.log("Setting live data  :  v" + liveDatas.datas.version)
console.log("Intervals: ", intervals)



//console.log('Launching automation scripts')
//require('./scripts/serverScripts.js')  // generate infos/index.html




