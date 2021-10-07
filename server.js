require('dotenv/config')
const express = require('express'),
session = require('express-session'),
serveIndex = require('serve-index'),
path = require('path'),
app = express()
//const cors = require('cors')

app.set('view engine', 'ejs')

var corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200,
  }

const PUBLIC_HTML = path.resolve(__dirname, 'public') 
const TOOLS_HTML = path.resolve(__dirname, 'public/Tools')


//Middlewares 
//app.use(cors(corsOptions))
var hourMs = 1000*60*60;
app.use(express.static(PUBLIC_HTML, { maxAge: hourMs })) // maxAge allow client to cache data for 1h
// use serve index to nav folder  (Attention si utiliser sur le public folder, la racine (/) du site sera index au lieu de html
//app.use('/Tools', serveIndex( path.resolve(__dirname, 'public/Tools')));
app.use('/Tools', serveIndex(TOOLS_HTML))

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


//console.log('Launching automation scripts')
//require('./serverScripts.js')  // generate infos/index.html


var nodeTools = require('./nodeTools')
nodeTools.readFile("greetings.txt")





