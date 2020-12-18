const express = require('express')
const session = require('express-session')

const {
    NODE_ENV = 'development',
    PORT = 3000,
    SESS_NAME = 'sid',
    SESS_SECRET = 'ssh!quiet, it\'s a secret!',
    SESS_LIFETIME = 1000 * 60 * 60 * 2   //  2 hours
} = process.env

const IN_PROD = NODE_ENV === 'production'  // for https channel...  IN_PROD will be true if in production environment

const app = express()
app.use(express.static('public'))
app.set('view engine', 'ejs')

app.use(session({
    name: SESS_NAME,
    resave: false,
    saveUninitialized: false,
    secret: SESS_SECRET,
    cookie: {
        secure: IN_PROD,
        maxAge: SESS_LIFETIME,
        sameSite: true
    }
}))



// Import routes
const routes = require('./routes/routes')

// Route middleware
app.use('/', routes)


const server = app.listen(PORT, '0.0.0.0', () =>{
    var port = server.address().port
    console.log('\n\n')
    console.log('app listening at http://0.0.0.0:%s', port)
    console.log(`Express is running on port ${port}`);
    console.log('Press Ctrl + C to exit\n')
 })



console.log('Launching automation scripts')
require('./serverScripts.js')