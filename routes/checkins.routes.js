const router = require('express').Router()
//const fetch = require('node-fetch')
//const verify = require('./verifyToken')
const mailman = require('./mailman')


//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
const bodyParser = require("body-parser"); //  requis sinon le body est vide...!?
//router.use(bodyParser.json());
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
router.use(bodyParser.json({ limit: '10mb', extended: true }));


const Datastore = require('nedb')
const picDb = new Datastore('pics.db');
picDb.loadDatabase();

router.get('/api', (request, response) => {
    picDb.find({}, (err, data) => {
        if (err) { response.end(); return; }
        response.json(data);
    });
});

router.post('/api', bodyParser.json(), (req, res) => {  //  TODO : je crois que bodyparser n'est plus requis... bug corrigé

    console.log('\npost to /checkins/api')
    const data = req.body
    const timestamp = Date.now()
    data.timestamp = timestamp
    picDb.insert(data)
    res.json(data)

});

router.post('/alert', bodyParser.json(), async (req, res) => {

    console.log('post to Alert:')

    const alert = req.body
    const dest = alert.dest
    const msg = alert.msg
    const image64 = alert.image64
    //console.log(alert)

    console.log(dest, msg);

    const answer = await mailman.sendEmail(dest, msg, image64)
    console.log(answer)

})




module.exports = router;