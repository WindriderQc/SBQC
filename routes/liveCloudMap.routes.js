const express = require('express');
const router = express.Router();
const https = require('https');

/**
 * Live Cloud Map Proxy
 * 
 * Proxies real-time cloud coverage data from clouds.matteason.co.uk
 * Data source: EUMETSAT satellites, updated every 3 hours
 * Format: 2048x1024 PNG with alpha transparency (equirectangular projection)
 * 
 * @see https://clouds.matteason.co.uk/
 * @see https://github.com/matteason/live-cloud-maps
 */
router.get('/live-cloud-map', (req, res) => {
    // Source updates every 3 hours with fresh EUMETSAT satellite data
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