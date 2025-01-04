require('dotenv').config();
const router = require('express').Router()

// Dynamic import for node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

//const fetch = require('node-fetch')

const liveData = require('../scripts/liveData')

router.get('/', async (req, res) => {

    res.json(liveData.data)
})


router.get('/iss', async (req, res) => {

    res.json(liveData.data.iss)
})

router.get('/quakes', async (req, res) => {

    res.json(liveData.data.quakes)
})


module.exports = router;
