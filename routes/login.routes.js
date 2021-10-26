const router = require('express').Router(),
 moment = require('moment'),
 bcrypt = require('bcryptjs'),
 jwt = require('jsonwebtoken'),
 verify = require('./verifyToken'),
 { registerValidation, loginValidation } = require('./validation')

User = require('../models/userModel')

  

router.post('/login', async (req, res) => {  
    
    console.log('login request: ' + req.body.email)

    try {
        const result = {
            email: req.body.email,
            message: "",
            token: ""
        }
  
        //  Validate entry form before login
        const { error } = loginValidation(req.body)
        if (error) {
        
            result.message = error.details[0].message
            console.log(result.message)
            return res.status(400).send(result)
        }
    
        // Check if user exist
        const user = await User.findOne({ email: req.body.email })
        if (!user) {
            result.message = "Email is not found"
            console.log(result.message)
            return res.status(400).send(result)
        }

        // Check password
        const validPass = await bcrypt.compare(req.body.password, user.password)
        if (!validPass) {
            result.message = "Email or password is wrong"
            console.log(result.message)
            return res.status(400).send(result)
        }
        else console.log('Login success: ' + user)
        
        // Create and assign a token
        const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET)
        result.token = token
        result.message = "Success!"
      //  res.header("auth-token", token).send(result)
        

        // updating user
        user.lastConnect = moment().format('YYYY-MM-DDTHH:mm:ss.SSS')
        user.save((err) => { console.error(err) })

        // updating user via API
  /*    const option = {
            method: 'PATCH',
            headers: {
                'auth-token': token,
                'Accept': 'application/json, text/plain, ',
                'Content-Type': 'application/json'
                //'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: JSON.stringify({ name: user.name, email: user.email, password: user.password, lastConnect: moment().format('YYYY-MM-DDTHH:mm:ss.SSS') })
        }

        let url = process.env.API_URL + '/users/' + user._id
        const resp = await fetch(url, option)
        const data = await JSON.stringify(resp)
        console.log(data)*/

        console.log('login response: ' + result.message);
        if (result.token.length > 5) {
            //const str = JSON.stringify(result.token) 
            //console.log(result)
            req.session.userToken = result.token
            req.session.email = result.email
            
            
            //res.redirect('vip/fundev')

            console.log(req.baseUrl)

            req.session.save((err) => { if(!err) res.redirect('../fundev') })

           // res.render('fundev', { name: req.session.email });
         // res.redirect('/fundev')
           //res.header("auth-token", result.token).render('fundev', { name: req.session.email });
        }

        else
            res.render('partials/loginnomatch')
    }
    catch (err) {
        console.log(err)
    }

})





// Export API routes
module.exports = router