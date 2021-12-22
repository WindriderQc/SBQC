//  Mongoose has more functionality but requires rigid data model, while native mongodb driver does not restrict data model

require('dotenv/config')
const mongoClient = require("mongodb").MongoClient


const mongo = {
    connectDb: (dbName, callback) => 
    {
        mongoClient.connect(process.env.MONGO_URL,  { useNewUrlParser: true, useUnifiedTopology: true })
        .then(client =>{
            console.log('MongoDB client connected to db: ' + process.env.MONGO_URL)  
           
            client.db().admin().listDatabases().then(dbs => {
                console.log( dbs)
            })

            this.db = client.db(dbName);

            callback(this.db )
        })
    },
    
    getCollectionsList:  async () => 
    {
        try {
            const collInfos =  await this.db.listCollections().toArray() 
           // console.log(collInfos)
            return collInfos
        } 
        catch(e) { console.log(e)}
       
    },
    
    getDb: (collectionToGet) => 
    {
            return this.db.collection(collectionToGet)
    }
    
}


module.exports = mongo