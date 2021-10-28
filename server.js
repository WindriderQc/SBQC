require('dotenv/config')
const express = require('express'),
  session = require('express-session'),
  MongoDBStore = require('connect-mongodb-session')(session);
  cookieParser = require("cookie-parser"),
  serveIndex = require('serve-index'),
  path = require('path'),
  mongoose = require('mongoose'),
  nodeTools = require('./scripts/nodeTools'),
  moment = require('moment')
//rateLimit = require('express-rate-limit'),
const cors = require('cors')
//Logger = require('./logger'),

/*const logger = new Logger()
//logger.on('message', (data) => console.log('Called Listener: ', data))    //  exemple de trigger sur un event
logger.log('Server launching....' + moment().format('LLLL'))
*/

const PORT = process.env.PORT  || 5000
const IN_PROD = process.env.NODE_ENV.trim() === 'production'  // for https channel...  IN_PROD will be true if in production environment
console.dir(process.env.NODE_ENV)
console.log('env prod:' + IN_PROD)



const app = express()
app.set('view engine', 'ejs')

const mongoStore = new MongoDBStore({  
  uri: process.env.MONGO_URL,  
  collection: 'mySessions', 
  connectionOptions: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // serverSelectionTimeoutMS: 10000
  }
}, (err)=> console.error(err))

mongoStore.on('error', function(error) {  console.log(error) });




const sessionOptions = {
  name: process.env.SESS_NAME,
  resave: false,
  saveUninitialized: true,
  secret: process.env.SESS_SECRET,
  store: mongoStore,
  cookie: {
      secure: IN_PROD, // Please note that secure: true is a recommended option. However, it requires an https-enabled website, i.e., HTTPS is necessary for secure cookies. If secure is set, and you access your site over HTTP, the cookie will not be set.
     // maxAge: Number(process.env.SESS_LIFETIME),   //  TODO: Bug...  le cookie est pas saved apres le login avec ce maxAge.
      sameSite: true
  }
}




//  Databases


// mongoose with local DB
mongoose.connect( process.env.MONGO_URL, { family: 4, useNewUrlParser: true, useUnifiedTopology: true })// family: 4    skip  default IPV6 connection  and accelerate connection.

mongoose.connection.on('error', console.error.bind(console, 'conn error:'))

mongoose.connection.once('open', function() { 
    console.log('Mongoose connected to db: ' + process.env.MONGO_URL) 
   
    mongoose.connection.db.listCollections().toArray( (err, collections) => {   //trying to get collection names
        console.log("LocalDB collections:")
        console.log(collections); // [{ name: 'dbname.myCollection' }]
       // module.exports.Collection = collections;
    });

})

//Mongodb Client setup  with CloudDB
/*const mongo = require('./mongo')

mongo.connectDb('test', async (mongodb) =>{    // dbServ, test, admin, local 

    app.locals.collections = [] 
    const list = await mongo.getCollectionsList()

    console.log("Assigning Collections to app.locals :")
    for(coll of list) {
        console.log(coll.name)
        app.locals.collections[coll.name] = mongo.getDb(coll.name)
    }
    //db.createCollection('server')
    app.locals.collections.server.insertOne({ name: "dbServer boot", date: Date.now() })   //   TODO:  Server may not exist

})
*/

/*
// Set default API response  
//app.get('/', (req, res) => {  res.send('SBQC\n')  })
app.get('/', function (req, res) {
res.json({
    status: 'dbServ node server active',
    message: 'Welcome to SBQC DB server'
})
})
app.use((error, req, res, next) => {
res.status(500);
res.json({
message: error.message
})
})
*/




//Middlewares  & routes
app
  .use(cors({    origin: '*',    optionsSuccessStatus: 200  }  ))
  .use(express.urlencoded({extended: true, limit: '10mb'}))  //  Must be before  'app.use(express.json)'    , 10Mb to allow image to be sent
  .use(express.json({limit:'10mb'})) // To parse the incoming requests with JSON payloads
  //.use(rateLimit({ windowMs: 2 * 1000, max: 1 }))  // useful for api to prevent too many requests...
  .use(cookieParser())  //  recommanded before app.use(session())
  .use(session(sessionOptions))
  .use(express.static(path.resolve(__dirname, 'public') , { maxAge: 1000*60*60 })) // maxAge allow client to cache data for 1h
  .use('/',         require('./routes/routes'))
  .use('/checkins', require('./routes/checkins.routes'))
  .use('/data',     require('./routes/data.routes'))
  .use('/login',     require('./routes/login.routes'))
  .use('/meows', require("./routes/meows.routes"))
  .use('/Tools',    serveIndex(path.resolve(__dirname, 'public/Tools'), {  'icons': true,  'stylesheet': 'public/css/indexStyles.css' } )) // use serve index to nav folder  (Attention si utiliser sur le public folder, la racine (/) du site sera index au lieu de html
  .use('/Projects', serveIndex(path.resolve(__dirname, 'public/Projects'), {  'icons': true,  'stylesheet': 'public/css/indexStyles.css' }))


  app.listen(PORT, () =>{  
    console.log(`\n\nServer running in ${IN_PROD ? "Production" : "Developpement"} mode at port ${PORT}`)
    console.log(`(Nginx may change public port)`)
    console.log('Press Ctrl + C to exit\n')
    nodeTools.readFile("greetings.txt")
  })




//console.log('Launching automation scripts')
//require('./scripts/serverScripts.js')  // generate infos/index.html


let liveDatas = require('./scripts/liveData.js')
const intervals = { quakes:1000*60*60*24*7, iss: 1000*10 }
liveDatas.setAutoUpdate(intervals)
console.log("Setting live data  :  v" + liveDatas.data.version)
console.log("Intervals: ", intervals)


