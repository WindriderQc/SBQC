const sendEmail = async (mail, msg, image64) => {

    const nodemailer = require('nodemailer'); 
    const smtpTransport = require('nodemailer-smtp-transport');


    this.admin = process.env.ADM_MAIL;
    this.admpass = process.env.ADM_PASS;

    console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
    console.log ("Sending email from: " + this.admin) //, this.admpass)
    var transporter = nodemailer.createTransport(smtpTransport({      
   // var transporter = nodemailer.createTransport({      
        service: 'gmail',
        auth: {
                user: this.admin,
                pass: this.admpass
            }
    }))
        

    const htmlmsg = '<html><body><p>motion detected</p><p>*-*</p></body></html>'
    //console.log(htmlmsg)

    var mailOptions = {
        from: this.admin,
        to: mail, // yanikbeaulieu@hotmail.com, yanikbeaulieu@gmail.com, 
        subject: 'Alert from Node server',
        //text: msg,
        html: htmlmsg,
        attachments: [
            {   // data uri as an attachment
                path: image64
            }]
               

    }
     
    
    transporter.sendMail(mailOptions, (error, info) =>{
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
           // return info.response
        }
    })
     
}


module.exports = {
    sendEmail
  }