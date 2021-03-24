require('dotenv/config')
const express = require('express')
const cors = require('cors')

const app = express()
app.set('view engine', 'ejs')

//Middlewares
app.use(cors())
app.use(express.static(__dirname + '/public'));
app.use(express.json())

app.use(rateLimit({
    windowMs: 30 * 1000, // 30 seconds
    max: 1
  }));


// Import routes
//const routes = require('./routes/routes')


// Route middleware
//app.use('/', routes)


app.listen(process.env.PORT, () =>{
    console.log('\n\nServer running at port %s', process.env.PORT)
    console.log('Press Ctrl + C to exit\n')
 })


var nodeTools = require('./nodeTools')
nodeTools.readFile("greetings.txt")




 
const mongo = require('mongodb').MongoClient;

mongo.connect(process.env.MONGO_URL, function(err, db) {
  if (err) throw err;
  console.log("Database created!");
  db.close();
});