const { all } = require('../routes/checkins.routes');

const mongoose = require('mongoose')
        , Admin = mongoose.mongo.Admin;
  
const url = process.env.MONGO_URL ? process.env.MONGO_URL : "mongodb://127.0.0.1:27017/IoT"   //  attempt at local database if no cloud URL defined, prevent crash if no .env file is found nor url defined

let _collections 
let isReady = false
// mongoose with local DB      'mongodb://user:pass@localhost:port/database'
mongoose.connect( url,  { family: 4, useNewUrlParser: true, useUnifiedTopology: true }, (err)=> { // family: 4    skip  default IPV6 connection  and accelerate connection.
        if (err) console.log(err)
      
        console.log('\nMongoose connected to db: ' + url)   
      
        new Admin(mongoose.connection.db).listDatabases((err, result) => {
            console.log('Databases listing:');
            // database list stored in result.databases
            const allDatabases = result.databases;    
            console.log(allDatabases)
        })
    
    })

mongoose.connection.on('error', console.error.bind(console, 'conn error:'))

mongoose.connection.once('open', function() { 
    


    mongoose.connection.db.listCollections().toArray( (err, col) => {   //trying to get collection names
        if(err) console.log(err)
     
      
        console.log("DB collections:")
        console.log(col) // [{ name: 'dbname.myCollection' }]
        console.log('\n')

        _collections = col
        isReady = true
        //module.exports.Collections = _collections;
    })

})


exports.isReady = () => { return isReady  }

exports.getCollections = () => { return JSON.stringify(_collections) }