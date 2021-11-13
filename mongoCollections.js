const mongoose = require('mongoose')

const dbURL = process.env.MONGO_URL

let _collections 
let isReady = false
// mongoose with local DB
mongoose.connect( dbURL, { family: 4, useNewUrlParser: true, useUnifiedTopology: true }, (err)=>{ if (err) console.log(err)})// family: 4    skip  default IPV6 connection  and accelerate connection.

mongoose.connection.on('error', console.error.bind(console, 'conn error:'))

mongoose.connection.once('open', function() { 
    console.log('Mongoose connected to db: ' + dbURL) 
   
    mongoose.connection.db.listCollections().toArray( (err, col) => {   //trying to get collection names
        if(err) console.log(err)
        console.log("LocalDB collections:")
       
        _collections = col  
        _collections.forEach((collection) =>{
             console.log(collection.name)
        }) //console.log(_collections) // [{ name: 'dbname.myCollection' }]
        console.log()
        
        isReady = true
    });
})


exports.isReady = () => { return isReady  }

//exports.getCollections = () => { return _collections }