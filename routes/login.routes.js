//const session = require('express-session');

const router = require('express').Router(),
 moment = require('moment'),
 bcrypt = require('bcryptjs'),
 jwt = require('jsonwebtoken'),
 { body, validationResult } = require('express-validator'),
 verify = require('./verifyToken'),
 { registerValidationRules, loginValidationRules } = require('./validation')

const LOGIN_SUCCESS_REDIRECT_PATH = '../dashboard'; // Redirect to SBQC dashboard after login

const apiUrl = "http://" + process.env.DATA_API_IP + ":" + process.env.DATA_API_PORT


router.get("/register", (req, res) => {
    res.render('partials/login/register');
})


router.post("/register", registerValidationRules(), async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => error.msg).join(' ');
      return res.status(400).render('partials/login/register', {
        error: errorMessages,
        name: req.body.name,
        email: req.body.email
      });
    }

     const result = {
        user: req.body.name,
        email: req.body.email,
        message: ""
    }

    const response2 = await fetch(apiUrl + "/api/v1/users?email=" + req.body.email)
    const respJson = await response2.json()
    const emailExist = respJson.data[0]
    console.log('existing user entry: ', emailExist, '\n')

    if (emailExist) {
        console.log('user exist: ', emailExist)
        result.message = "Email already exists"
        // return res.status(400).send(result)  //  TODO: replace par un login.ejs ou register.ejs avec alert msg
        return res.status(400).render('partials/login/register', {
            error: result.message,
            name: req.body.name, // To repopulate the form
            email: req.body.email // To repopulate the form
        });
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
        const rawResponse = await fetch(apiUrl + '/api/v1/users', { method: 'POST', headers: { "Content-type": "application/json" }, body: JSON.stringify(user)    });
        const r = await rawResponse.json()
        if(r.status === 'success')  {  console.log(r.message, r.data)  } else console.log(r.status, r.message ) 
        res.redirect('../')
    }
    catch (err) { 
        return next(err);
    }
            
})


router.get('/', (req, res) => {
    res.render('partials/login/login') 
})

router.post('/', loginValidationRules(), async (req, res, next) => {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => error.msg).join(' ');
      return res.render('partials/login/loginnomatch', { alertMsg: "Oups: " + errorMessages });
    }

    console.log('login request: ', req.body.email)

    try {
        const result = {
            email: req.body.email,
            message: "",
            token: ""
        }
    
        // Check if user exist
        //const user = await User.findOne({ email: req.body.email })
        
        const response2 = await fetch(apiUrl + "/api/v1/users?email=" + req.body.email)
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
            const rawResponse = await fetch(apiUrl + '/api/v1/users/' + user._id, { method: 'PATCH', headers: { "Content-type": "application/json" }, body: JSON.stringify(user) });
            
            const r = await rawResponse.json()
            if(r.status === 'success')  {  console.log(r.message)  } else console.log(r.status, r.message ) 
        }
        catch (err) { 
            return next(err);
        }

    
    console.log('login response: ', result.message);
    if (result.token.length > 5) {
   
        // Store userId in session for nodeTools auth middleware
        req.session.userId = user._id.toString() // nodeTools attachUser looks for this
        req.session.email = result.email
        req.session.userToken = result.token // Keep for backward compatibility (optional)
        console.log('saving session:\n', req.session)
        
        try  {
            await req.session.save();
            res.header('credentials', 'include').redirect(LOGIN_SUCCESS_REDIRECT_PATH)    //res.header("auth-token", result.token).render('fundev', { name: req.session.email });      // TODO : /settings hardcoded here...   hmmm   nah! :S
        } catch (err) {
            return next(err);
        }
         
    }
    else res.render('partials/login/loginnomatch', { alertMsg: 'Sorry, something wrong with authentification. Please contact your admin.'})
    }
    catch (err) {
        return next(err);
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



// Export login/register routes
module.exports = router

