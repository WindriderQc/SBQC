const router = require('express').Router()
//const fetch = require('node-fetch')
//const verify = require('./verifyToken')




////const Datastore = require('nedb')
//const picDb = new Datastore('pics.db');
//picDb.loadDatabase();

router.get('/api', (request, response) => {
    picDb.find({}, (err, data) => {
        if (err) { response.end(); return; }
        response.json(data);
    });
});

router.post('/api', (req, res) => { 

    console.log('\npost to /checkins/api')
    const data = req.body
    const timestamp = Date.now()
    data.timestamp = timestamp
    picDb.insert(data)
    res.json(data)

});





module.exports = router;