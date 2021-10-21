let router = require('express').Router()

//  meower
const Filter = require('bad-words')
const filter = new Filter();



router.get('/', (req, res) => {
    res.json({
      message: 'Meower!'
    })
})
  
router.get('/mews', async (req, res, next) => {
    const mewsdb =  req.app.locals.meows

    mewsdb
        .find()
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

    Promise.all([
        mewsdb.countDocuments(),
        mewsdb.find({}, {
            skip,
            limit,
            sort: {  created: sort === 'desc' ? -1 : 1     }
        }).toArray()
    ])
    .then(([ total, mews ]) => {

        // console.log(mews)
        res.json({
        mews,
        meta: {
            total,
            skip,
            limit,
            has_more: total - (skip + limit) > 0,
        }
        })
    }).catch(next)



})

function isValidMew(mew) {
    return mew.name && mew.name.toString().trim() !== '' && mew.name.toString().trim().length <= 50 &&
        mew.content && mew.content.toString().trim() !== '' && mew.content.toString().trim().length <= 140
}





const createMew = async (req, res, next) => {
    if (isValidMew(req.body)) {
        const mew = {
        name: filter.clean(req.body.name.toString().trim()),
        content: filter.clean(req.body.content.toString().trim()),
        created: new Date()
        }
        
        const mewsdb =  req.app.locals.collections.mews;
    try{
        const createdMew = await mewsdb.insertOne(mew)
        console.log(
        `${createdMew.insertedCount} documents were inserted with the _id: ${createdMew.insertedId}`,
        )
        // console.log(createdMew.ops)
        res.json(createdMew)
    }
    catch(err) {console.log(err); next() }
        
    } else {
        res.status(422)
        res.json({
        message: 'Hey! Name and Content are required! Name cannot be longer than 50 characters. Content cannot be longer than 140 characters.'
        })
    }
}

router.post('/mews', createMew)
router.post('/v2/mews', createMew)






// Export API routes
module.exports = router