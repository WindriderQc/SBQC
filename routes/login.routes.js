//const session = require('express-session');

const router = require('express').Router(),
 moment = require('moment'),
 bcrypt = require('bcryptjs'),
 jwt = require('jsonwebtoken'),
 verify = require('./verifyToken'),
 { registerValidation, loginValidation } = require('./validation')

User = require('../models/userModel')




router.get("/register", (req, res) => {
    res.render('partials/register');
})


router.post("/register", async (req, res) => {
    const result = {
        user: req.body.name,
        email: req.body.email,
        message: ""
    }

    //  Validate entry form before user creation
    const { error } = registerValidation(req.body)
    if (error) {
        result.message = error.details[0].message
        return res.status(400).send(result)
    }

    const emailExist = await User.findOne({ email: req.body.email })
    if (emailExist) {
        console.log('user exist: ', emailExist)
        result.message = "Email already exists"
        return res.status(400).send(result)  //  TODO: replace par un login.ejs ou register.ejs avec alert msg
    }


    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashPassword = await bcrypt.hash(req.body.password, salt)

    const user = new User({
        name : req.body.name,
        email : req.body.email,
        password: hashPassword
    })
        

    try {
        const savedUser =  await user.save()
        console.log('Saved user:\n', savedUser)
        result.user = savedUser.name + " - " + savedUser._id
        result.message = 'Success'
        res.redirect('../')
    } 
    catch (err) {   
        console.log('Error in post register: ', result)
        res.redirect('/login/register')   
    }


    
})


router.get('/', (req, res) => {
    res.render('partials/login') 
})

router.post('/', async (req, res) => {  
    
    console.log('login request: ', req.body.email)

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
            console.log('login validation error: ', result.message)
            //return res.status(400).send(result)
            return res.render('partials/loginnomatch', {alertMsg: "Oups: " + result.message})
        }
    
        // Check if user exist
        const user = await User.findOne({ email: req.body.email })
        if (!user) {
            result.message = "Email is not found"
            console.log(result.message)
            //return res.status(400).send(result)
            return res.render('partials/loginnomatch', {alertMsg: "User not found. Please register or contact your admin."})
        }

        // Check password
        const validPass = await bcrypt.compare(req.body.password, user.password)
        if (!validPass) {
            result.message = "Email or password is wrong"
            console.log(result.message)
            //return res.status(400).send(result)
            return res.render('partials/loginnomatch', {alertMsg: "Sorry, email or password incorrect. Please try again."})
        }
        else console.log('Login success: ', user)
        
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

        console.log('login response: ', result.message);
        if (result.token.length > 5) {
       
            req.session.userToken = result.token
            req.session.email = result.email
            console.log('saving session:\n', req.session)
            
            try  {
                await req.session.save();
                res.header('credentials', 'include').redirect('../fundev')    //res.header("auth-token", result.token).render('fundev', { name: req.session.email });    
            } catch (err) {
                console.log('error saving session' , err); 
                res.status(500).send('Error saving session');  
            }
             
        }
        else res.render('partials/loginnomatch', { alertMsg: 'Sorry, something wrong with authentification. Please contact your admin.'})
    }
    catch (err) {
        console.log('Error in post login', err)
    }

})


router.get('/out', (req, res) => {

    res.clearCookie(process.env.SESS_NAME)
    res.redirect('../')
   /* req.session.destroy(err => {
        if (err) res.send('error destroying session')
        console.log('Session destroyed and logged out')
        res.clearCookie(process.env.SESS_NAME)
        res.redirect('../')
    })*/
})



// Export API routes
module.exports = router

