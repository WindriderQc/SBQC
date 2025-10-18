const express = require('express');
const router = express.Router();
const https = require('https');

router.get('/live-cloud-map', (req, res) => {
    const imageUrl = 'https://clouds.matteason.co.uk/images/2048x1024/clouds-alpha.png';

    https.get(imageUrl, (imageStream) => {
        if (imageStream.statusCode === 200) {
            res.setHeader('Content-Type', imageStream.headers['content-type']);
            imageStream.pipe(res);
        } else {
            res.status(imageStream.statusCode).send('Error fetching cloud map image.');
        }
    }).on('error', (e) => {
        console.error(`Error fetching cloud map: ${e.message}`);
        res.status(500).send('Failed to fetch cloud map image.');
    });
});

module.exports = router;