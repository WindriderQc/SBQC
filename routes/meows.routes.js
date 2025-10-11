let router = require('express').Router();
const { BadRequest } = require('../utils/errors');
const dataApiService = require('../services/dataApiService');

//  meower

router.get('/', (req, res) => {
    res.json({
      message: 'Meower!'
    })
})
  
// Legacy endpoint - returns all mews (now proxies to DataAPI)
router.get('/mews', async (req, res, next) => {
    try {
        const response = await dataApiService.getMews();
        // DataAPI /api/v1/v2/mews returns { mews, meta } format
        // Legacy endpoint expects just the array
        res.json(response.mews || response.data || []);
    } catch (error) {
        next(error);
    }
})

// V2 endpoint with pagination (proxies to DataAPI)
router.get('/v2/mews', async (req, res, next) => {
    try {
        let { skip = 0, limit = 5, sort = 'desc' } = req.query;
        skip = parseInt(skip) || 0;
        limit = parseInt(limit) || 5;

        skip = skip < 0 ? 0 : skip;
        limit = Math.min(50, Math.max(1, limit));

        const response = await dataApiService.getMews({ skip, limit, sort });
        
        // DataAPI /api/v1/v2/mews returns { mews, meta } format already
        // Just pass it through
        res.json(response);
    } catch (error) {
        next(error);
    }
})

function isValidMew(mew) {
    return mew.name && mew.name.toString().trim() !== '' && mew.name.toString().trim().length <= 50 &&
        mew.content && mew.content.toString().trim() !== '' && mew.content.toString().trim().length <= 140
}

const createMew = async (req, res, next) => {
    try {
        if (!isValidMew(req.body)) {
            throw new BadRequest('Hey! Name and Content are required! Name cannot be longer than 50 characters. Content cannot be longer than 140 characters.');
        }

        const mewData = {
            name: req.body.name.toString().trim(),
            content: req.body.content.toString().trim()
        };
        
        // Proxy to DataAPI
        const response = await dataApiService.createMew(mewData);
        res.json(response);
    }
    catch(err) {
        next(err);
    }
}

router.post('/mews', createMew)
router.post('/v2/mews', createMew)




// Export API routes
module.exports = router;