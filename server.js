require('dotenv/config')
const express = require('express'),
session = require('express-session'),
serveIndex = require('serve-index'),
path = require('path'),
app = express()
//const cors = require('cors')

app.set('view engine', 'ejs')

let corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200,
  }


const hourMs = 1000*60*60;

//Middlewares 

//app.use(cors(corsOptions))
app.use(express.static(path.resolve(__dirname, 'public') , { maxAge: hourMs })) // maxAge allow client to cache data for 1h
app.use('/Tools', serveIndex(path.resolve(__dirname, 'public/Tools'), {
    'icons': true,
    'stylesheet': 'public/Tools/indexStyles.css'
  })) // use serve index to nav folder  (Attention si utiliser sur le public folder, la racine (/) du site sera index au lieu de html
app.use('/Projects', serveIndex(path.resolve(__dirname, 'public/Projects'), {
    'icons': true,
    'stylesheet': 'public/Tools/indexStyles.css'
  }))
app.use(express.json())

const IN_PROD = process.env.NODE_ENV === 'production'  // for https channel...  IN_PROD will be true if in production environment
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


// Import routes
const routes = require('./routes/routes')
const checkins = require('./routes/checkins.routes')
const liveData = require('./routes/data.routes')

// Route middleware
app.use('/', routes)
app.use('/checkins', checkins)
app.use('/data', liveData)

app.listen(process.env.PORT, () =>{
    console.log('\n\nServer is not running at port %s', process.env.PORT)
    console.log('Press Ctrl + C to exit\n')
 })


console.log('Launching nodeTools and AI')
var nodeTools = require('./nodeTools')
nodeTools.readFile("greetings.txt")


console.log('Launching automation scripts')
require('./serverScripts.js')  // generate infos/index.html








