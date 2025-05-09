const { all } = require('../routes/checkins.routes');

const mongoose = require('mongoose')
        , Admin = mongoose.mongo.Admin;
  
const url = process.env.MONGO_URL ? process.env.MONGO_URL : "mongodb://127.0.0.1:27017/IoT"   //  attempt at local database if no cloud URL defined, prevent crash if no .env file is found nor url defined

if(typeof process.env.MONGO_URL === 'undefined')  // TODO  beau bordel avec la ligne en haut....
{
    console.log('MONGO_URL undefined. Check if .env file properly configured?')
    //process.exit(1)
}

let _collections 
let isReady = false
// mongoose with local DB      'mongodb://user:pass@localhost:port/database'  //  to use other than local host, bindIP must be changed to 0.0.0.0 in mongod.conf
mongoose.connect( url,  { family: 4 }, (err)=> { // family: 4    skip  default IPV6 connection  and accelerate connection.
        if (err) console.log(err)
      
      
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
     
        console.log('\nMongoose connected to db: ' + url)   
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