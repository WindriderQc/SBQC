//const session = require('express-session');

const router = require('express').Router(),
 moment = require('moment'),
 bcrypt = require('bcryptjs'),
 jwt = require('jsonwebtoken'),
 verify = require('./verifyToken'),
 { registerValidation, loginValidation } = require('./validation')


const apiUrl = "http://" + process.env.DATA_API_IP + ":" + process.env.DATA_API_PORT


router.get("/register", (req, res) => {
    res.render('partials/login/register');
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

    const response2 = await fetch(apiUrl + "/users/fromEmail/" + req.body.email)
    const respJson = await response2.json()
    const emailExist = respJson.data[0]
    console.log('existing user entry: ', emailExist, '\n')

    if (emailExist) {
        console.log('user exist: ', emailExist)
        result.message = "Email already exists"
        return res.status(400).send(result)  //  TODO: replace par un login.ejs ou register.ejs avec alert msg
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashPassword = await bcrypt.hash(req.body.password, salt)

  
    const user = {
        name : req.body.name,
        email : req.body.email,
        password: hashPassword
    }

    
    try {
        const rawResponse = await fetch(apiUrl + '/users', { method: 'POST', headers: { "Content-type": "application/json" }, body: JSON.stringify(user)    }); 
        const r = await rawResponse.json()
        if(r.status === 'success')  {  console.log(r.message, r.data)  } else console.log(r.status, r.message ) 
        res.redirect('../')
    }
    catch (err) { 
        console.log('Error in post register: ', result, err)
        res.redirect('/login/register')   
    }
            
})


router.get('/', (req, res) => {
    res.render('partials/login/login') 
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
            return res.render('partials/login/loginnomatch', {alertMsg: "Oups: " + result.message})
        }
    
        // Check if user exist
        //const user = await User.findOne({ email: req.body.email })
        
        const response2 = await fetch(apiUrl + "/users/fromEmail/" + req.body.email)
        const emailExist = await response2.json()
        const user = emailExist.data[0]
            
        if (!user) {
            result.message = "Email is not found"
            console.log(result.message)
            //return res.status(400).send(result)
            return res.render('partials/login/loginnomatch', {alertMsg: "User not found. Please register or contact your admin."})
        }

        // Check password
        const validPass = await bcrypt.compare(req.body.password, user.password)
        if (!validPass) {
            result.message = "Email or password is wrong"
            console.log(result.message)
            //return res.status(400).send(result)
            return res.render('partials/login/loginnomatch', {alertMsg: "Sorry, email or password incorrect. Please try again."})
        }
        else console.log('Login success: ', user)
        
        // Create and assign a token
        const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET)
        result.token = token
        result.message = "Success!"
      //  res.header("auth-token", token).send(result)
        


        // updating user via API
        //   const option = {  method: 'PATCH',  headers: { 'auth-token': token,  'Accept': 'application/json, text/plain ', 'Content-Type': 'application/json'  //'Content-Type': 'application/x-www-form-urlencoded'     }, ...
      
        try {
            console.log('updating user last connect -  id: ', user.email, user.lastConnectDate)
            user.lastConnectDate = moment().format('YYYY-MM-DDTHH:mm:ss.SSS')
              console.log(user.lastConnectDate)
            const rawResponse = await fetch(apiUrl + '/user/:  ' + user._id, { method: 'PATCH', headers: { "Content-type": "application/json" }, body: JSON.stringify(user) }); 
            
            const r = await rawResponse.json()
            if(r.status === 'success')  {  console.log(r.message)  } else console.log(r.status, r.message ) 
        }
        catch (err) { 
            console.log('Error in updating user: ',  err)
            res.redirect('../')   
        }

    
        console.log('login response: ', result.message);
        if (result.token.length > 5) {
       
            req.session.userToken = result.token
            req.session.email = result.email
            console.log('saving session:\n', req.session)
            
            try  {
                await req.session.save();
                res.header('credentials', 'include').redirect('../settings')    //res.header("auth-token", result.token).render('fundev', { name: req.session.email });      // TODO : /settings hardcoded here...   hmmm   nah! :S
            } catch (err) {
                console.log('error saving session' , err); 
                res.status(500).send('Error saving session');  
            }
             
        }
        else res.render('partials/login/loginnomatch', { alertMsg: 'Sorry, something wrong with authentification. Please contact your admin.'})
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

