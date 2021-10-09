require('dotenv/config')
const express = require('express'),
session = require('express-session'),
serveIndex = require('serve-index'),
path = require('path'),
nodeTools = require('./nodeTools')
//const cors = require('cors')

const app = express()
app.set('view engine', 'ejs')

const IN_PROD = process.env.NODE_ENV === 'production'  // for https channel...  IN_PROD will be true if in production environment
//let corsOptions = {    origin: '*',    optionsSuccessStatus: 200  }  


//Middlewares 

/*app.use(express.urlencoded({extended: true}));
app.use(express.json()) // To parse the incoming requests with JSON payloads
app.use(express.json({limit:'50mb'}));*/

app.use(session({
  name: process.env.SESS_NAME,
  resave: false,
  saveUninitialized: false,
  secret: process.env.SESS_SECRET,
  cookie: {
      secure: IN_PROD,
      maxAge: Number(process.env.SESS_LIFETIME),
      sameSite: true
  }
}))
//app.use(cors(corsOptions))

// Import routes & Route middleware
app.use(express.static(path.resolve(__dirname, 'public') , { maxAge: 1000*60*60 })) // maxAge allow client to cache data for 1h
app.use('/',         require('./routes/routes'))
app.use('/checkins', require('./routes/checkins.routes'))
app.use('/data',     require('./routes/data.routes'))

// Index served
const indexOptions = {  'icons': true,  'stylesheet': 'public/css/indexStyles.css' }
app.use('/Tools', serveIndex(path.resolve(__dirname, 'public/Tools'), indexOptions )) // use serve index to nav folder  (Attention si utiliser sur le public folder, la racine (/) du site sera index au lieu de html
app.use('/Projects', serveIndex(path.resolve(__dirname, 'public/Projects'), indexOptions))




// Launching Application
app.listen(process.env.PORT, () =>{
    console.log('\n\nServer is not running at port %s', process.env.PORT)
    console.log('Press Ctrl + C to exit\n')
    nodeTools.readFile("greetings.txt")
 })




 const osu = require('node-os-utils')

 let cpu = osu.cpu
 
 cpu.usage()
   .then(info => {
     console.log(info)
   })

/*console.log('Launching automation scripts')
require('./serverScripts.js')  // generate infos/index.html
*/

let liveDatas = require('./liveData.js')
console.log("Setting live data  :  v" + liveDatas.data.version)



