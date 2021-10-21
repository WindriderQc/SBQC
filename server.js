require('dotenv/config')
const express = require('express'),
session = require('express-session'),
serveIndex = require('serve-index'),
path = require('path'),
rateLimit = require('express-rate-limit'),
nodeTools = require('./nodeTools'),
//Logger = require('./logger'),
moment = require('moment')
//const cors = require('cors')


const IN_PROD = process.env.NODE_ENV === 'production'  // for https channel...  IN_PROD will be true if in production environment

const PORT = process.env.PORT  || 5000

const sessionOptions = {
                          name: process.env.SESS_NAME,
                          resave: false,
                          saveUninitialized: false,
                          secret: process.env.SESS_SECRET,
                          cookie: {
                              secure: IN_PROD,
                              maxAge: Number(process.env.SESS_LIFETIME),
                              sameSite: true
                          }
                        }


const app = express()
app.set('view engine', 'ejs')


/*const logger = new Logger()
//logger.on('message', (data) => console.log('Called Listener: ', data))    //  exemple de trigger sur un event
logger.log('Server launching....' + moment().format('LLLL'))
*/



//  Databases

//Mongodb Client setup  with CloudDB
const mongo = require('./mongo')

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




//Middlewares  & routes
app
  .use(express.urlencoded({extended: true, limit: '10mb'}))  //  Must be before  'app.use(express.json)'    , 10Mb to allow image to be sent
  .use(express.json({limit:'10mb'})) // To parse the incoming requests with JSON payloads
  //.use(rateLimit({ windowMs: 2 * 1000, max: 1 }))  // useful for api to prevent too many requests...
  .use(session(sessionOptions))
  .use(express.static(path.resolve(__dirname, 'public') , { maxAge: 1000*60*60 })) // maxAge allow client to cache data for 1h
  .use('/',         require('./routes/routes'))
  .use('/checkins', require('./routes/checkins.routes'))
  .use('/data',     require('./routes/data.routes'))
  .use('/meows', require("./routes/meows.routes"))
  .use('/Tools',    serveIndex(path.resolve(__dirname, 'public/Tools'), {  'icons': true,  'stylesheet': 'public/css/indexStyles.css' } )) // use serve index to nav folder  (Attention si utiliser sur le public folder, la racine (/) du site sera index au lieu de html
  .use('/Projects', serveIndex(path.resolve(__dirname, 'public/Projects'), {  'icons': true,  'stylesheet': 'public/css/indexStyles.css' }))
  //.use(cors({    origin: '*',    optionsSuccessStatus: 200  }  ))

// Launching server
  .listen(PORT, () =>{  
    console.log('\n\nServer is not running at port %s', PORT)
    console.log('Press Ctrl + C to exit\n')
    nodeTools.readFile("greetings.txt")
  })




/*console.log('Launching automation scripts')
require('./sscripts/serverScripts.js')  // generate infos/index.html
*/

let liveDatas = require('./liveData.js')
console.log("Setting live data  :  v" + liveDatas.data.version)



