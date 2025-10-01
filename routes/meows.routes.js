let router = require('express').Router();
const { BadRequest } = require('../utils/errors');

//  meower

router.get('/', (req, res) => {
    res.json({
      message: 'Meower!'
    })
})
  
router.get('/mews', async (req, res, next) => {
    const mewsdb =  req.app.locals.collections['mews']

    mewsdb
    .find({}).toArray()
    .then(mews => {
        res.json(mews)
    }).catch(next)

})

router.get('/v2/mews', async (req, res, next) => {
    // let skip = Number(req.query.skip) || 0
    // let limit = Number(req.query.limit) || 10
    let { skip = 0, limit = 5, sort = 'desc' } = req.query
    skip = parseInt(skip) || 0
    limit = parseInt(limit) || 5

    skip = skip < 0 ? 0 : skip;
    limit = Math.min(50, Math.max(1, limit))

    const mewsdb =  req.app.locals.collections['mews']
    console.log('Getting Meows from db namespace: ', mewsdb.namespace)

    Promise.all([
        mewsdb.countDocuments(),
        mewsdb.find({}, { skip, limit, sort: {  created: sort === 'desc' ? -1 : 1     } }).toArray()
    ])
    .then(([ total, mews ]) => {
        // console.log(mews)
        res.json({
        mews,
        meta: { total, skip, limit, has_more: total - (skip + limit) > 0, } })
    })
    .catch(next)

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

        const mew = {
            name: req.body.name.toString().trim(),
            content: req.body.content.toString().trim(),
            created: new Date()
        }
        
        const mewsdb =  req.app.locals.collections.mews;
        const createdMew = await mewsdb.insertOne(mew);
        console.log( `Mew document was inserted with the _id: ${createdMew.insertedId}` );
        res.json(createdMew);
    }
    catch(err) {
        next(err);
    }
}

router.post('/mews', createMew)
router.post('/v2/mews', createMew)




// Export API routes
module.exports = router;