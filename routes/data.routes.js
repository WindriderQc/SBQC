require('dotenv').config();
const router = require('express').Router()
const fetch = require('node-fetch')

const liveData = require('../liveData')

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
