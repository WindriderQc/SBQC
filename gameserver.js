require('dotenv/config')
const express = require('express'),
  path = require('path'),
  //mongoose = require('mongoose'),
  nodeTools = require('./scripts/nodeTools'),
  moment = require('moment'),
  compression = require('compression')
const cors = require('cors')


const PORT =  5000
const IN_PROD = process.env.NODE_ENV.trim() === 'production'  // for https channel...  IN_PROD will be true if in production environment
console.dir(process.env.NODE_ENV)
console.log('env prod:' + IN_PROD)


const app = express()
//app.set('view engine', 'ejs')



//  Databases


// mongoose with local DB
//require('./mongoCollections')


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
 // .use(cors({    origin: '*',    optionsSuccessStatus: 200  }  ))
  .use(express.urlencoded({extended: true, limit: '10mb'}))  //  Must be before  'app.use(express.json)'    , 10Mb to allow image to be sent
  .use(express.json({limit:'10mb'})) // To parse the incoming requests with JSON payloads
  .use(compression())
  .use(express.static(path.join(__dirname, '/MathGame'))) 

  app.listen(PORT, () =>{  
    console.log(`\n\nServer running in ${IN_PROD ? "Production" : "Developpement"} mode at port ${PORT}`)
    console.log(`(Nginx may change public port)`)
    console.log('Press Ctrl + C to exit\n')
    nodeTools.readFile("greetings.txt")
  })


  app.get('/', (req, res) => {  res.sendFile(path.join(__dirname, 'index.html')) })

//console.log('Launching automation scripts')
//require('./scripts/serverScripts.js')  // generate infos/index.html

/*
let liveDatas = require('./scripts/liveData.js')
const intervals = { quakes:1000*60*60*24*7, iss: 1000*30 }
liveDatas.setAutoUpdate(intervals)
console.log("Setting live data  :  v" + liveDatas.data.version)
console.log("Intervals: ", intervals)


*/