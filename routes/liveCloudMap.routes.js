const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

router.get('/', async (req, res, next) => {
    try {
        const imageUrl = 'https://api.met.no/weatherapi/geosatellite/1.4/global.png';
        const response = await fetch(imageUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const imageBuffer = await response.buffer();

        res.set('Content-Type', 'image/png');
        res.send(imageBuffer);
    } catch (error) {
        console.error('Error fetching cloud map:', error);
        res.status(500).send('Error fetching cloud map');
    }
});

module.exports = router;