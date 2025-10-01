const router = require('express').Router()
//const fetch = require('node-fetch')
//const verify = require('./verifyToken')




////const Datastore = require('nedb')
//const picDb = new Datastore('pics.db');
//picDb.loadDatabase();

router.get('/api', (request, response, next) => {
    try {
        picDb.find({}, (err, data) => {
            if (err) { return next(err); }
            response.json(data);
        });
    } catch(error) {
        next(error);
    }
});

router.post('/api', (req, res, next) => {
    try {
        console.log('\npost to /checkins/api')
        const data = req.body
        const timestamp = Date.now()
        data.timestamp = timestamp
        picDb.insert(data, (err, newDoc) => {
            if (err) { return next(err); }
            res.json(newDoc);
        });
    } catch(error) {
        next(error);
    }
});





module.exports = router;