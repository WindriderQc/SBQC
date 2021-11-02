const mongoose = require('mongoose')

let _collections 
let isReady = false
// mongoose with local DB
mongoose.connect( process.env.DB_CONNECTION, { family: 4, useNewUrlParser: true, useUnifiedTopology: true }, (err)=>{ if (err) console.log(err)})// family: 4    skip  default IPV6 connection  and accelerate connection.

mongoose.connection.on('error', console.error.bind(console, 'conn error:'))

mongoose.connection.once('open', function() { 
    console.log('Mongoose connected to db: ' + process.env.DB_CONNECTION) 
   
    mongoose.connection.db.listCollections().toArray( (err, col) => {   //trying to get collection names
        if(err) console.log(err)
        console.log("LocalDB collections:")
       
        _collections = col
        console.log(_collections) // [{ name: 'dbname.myCollection' }]
        isReady = true
       // module.exports.Collections = _collections;
    });

})


exports.isReady = () => { return isReady  }

//exports.getCollections = () => { return _collections }