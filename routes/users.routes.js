const router = require('express').Router(),
 fetch = require('node-fetch'),
 moment = require('moment'),
 verify = require('./verifyToken'),      //  TODO:   uniformisation? routes prend hasSession et ici on verifyToken...
 { registerValidation, loginValidation } = require('./validation'),
  apiUrl = process.env.API_URL

User = require('../models/userModel')



/*
// Gets back all users
router.get('/', verify, async (req, res) => {
    try{
       console.log('\n\nUserList requested')
        const users = await User.find()
        console.log(users)
        res.json(users)
    }catch(err) {
        res.json({message:err})
    }
})


//Get a specific user
router.get('/:userId', verify, async (req,res) => {
   
    try {
         //const loggedUser = await User.findbyOne({_id: req.user})
        //console.log(loggedUser)
        const user = await User.findById(req.params.userId)
        res.json(user)
    } 
    catch(err) {
        res.json({message: err})
    }

})

//Delete a specific user
router.delete('/:userId', verify, async (req,res) => {
  console.log(req.params.userId)
    try {
        const ack = await User.deleteOne( {_id : req.params.userId } )
        res.json(ack)
    } 
    catch(err) {
        res.json({message: err})
    }
})

// Update a user
router.patch('/:userId', verify, async (req,res) => {
    
    console.log('Patch User last connection: ')
    console.log(req.body)
  

    
    try {
        const ack = await User.updateOne( {_id : req.params.userId }, {$set: {name: req.body.name, email: req.body.email, password: req.body.password, lastConnectDate:req.body.lastConnect } } )
        res.json(ack)
    } 
    catch(err) {
        res.json({message: err})
    }
})


*/




router.get('/viaEmail/:email', verify, async (req,res) => {
   
    try {
        console.log('seeking: ' + req.params.email)
        const user = await User.findOne({ email: req.params.email } )
        console.log(user)
        //const t = await user.text()
        //console.log(t)
        res.send(user)
    } 
    catch(err) {
        res.json({message: err})
    }

})












router.post('/deleteViaEmail', verify, async (req, res) => {

    console.log('deleting : ' + req.body.email)

    let option = { headers: {  'auth-token': req.session.userToken        } }

    let uid

    try {
        option.method = 'GET'
        const response = await fetch(apiUrl + "/api/user/viaEmail/" + req.body.email, option)
        //console.log(res1)
        const data = await response.text()
        if (!data) {
            const message = "Email is not found";
            return res.status(400).send(message);
        } else uid = JSON.parse(data)


        option.method = 'DELETE'
        const res2 = await fetch(apiUrl + '/api/user/' + uid._id, option)
        const confirm = await res2.text()
        console.log(confirm)
    }
    catch (err) {
        console.error(err)
    }

})




// Export API routes
module.exports = router