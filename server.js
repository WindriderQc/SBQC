require('dotenv/config')
const express = require('express')
const session = require('express-session')
//const cors = require('cors')

const app = express()
app.set('view engine', 'ejs')

var corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200,
  }

//Middlewares
//app.use(cors(corsOptions))
app.use(express.static(__dirname + '/public'));
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





