const sendEmail = async (mail, msg, image64) => {

    const nodemailer = require('nodemailer');

    this.admin = process.env.ADM_MAIL;
    this.admpass = process.env.ADM_PASS;

    console.log("Sending email from: " + this.admin + " to " + mail);

    // Use nodemailer's built-in SMTP transport configuration instead of the
    // deprecated `nodemailer-smtp-transport` package. This removes that
    // dependency and avoids pulling in vulnerable transitive packages.
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: this.admin,
            pass: this.admpass
        }
    });
        

    const htmlmsg = '<html><body><p>motion detected</p><p>*-*</p></body></html>'
    //console.log(htmlmsg)

    var mailOptions = {
        from: this.admin,
        to: mail, 
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
        }
    })
   
}


module.exports = {
    sendEmail
}