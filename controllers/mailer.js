const nodemailer = require('nodemailer');
const config = require('../config');

var controller = {
    sendResetPasswordMail: (random, user) => {
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: config.mailer.email,
                pass: config.mailer.password
            }
        });
        
        const userEmail = config.mailer.email; //user.email
        const mailOptions = {
            from: `"${config.mailer.name}" <${config.mailer.email}>`,
            to: userEmail,
            subject: 'Reset Password Request',
            html: `Hello ${user.name},
                <br/><br/>
                Your reset password token is <b>${random}</b>.<br/>
                If you are viewing this mail from a Android Device click this <a href="${config.baseURL}/user/pass/reset/${random}/${userEmail}">link</a>. 
                The token is valid for only 2 minutes.
                <br/><br/>
                Thanks,
                Snapbill`

        };
        return transporter.sendMail(mailOptions);
    },
    sendActivationMail: (random, user) => {
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: config.mailer.email,
                pass: config.mailer.password
            }
        });
        
        const userEmail = config.mailer.email; //user.email
        const mailOptions = {
            from: `"${config.mailer.name}" <${config.mailer.email}>`,
            to: userEmail,
            subject: 'SnapBill - Account Activation',
            html: `Hello ${user.name},
                <br/><br/>
                Your activation token is <b>${random}</b>.<br/>
                Please click this <a href="${config.baseURL}/user/activate/${userEmail}/${random}">link</a>, to activate your account
                The token is valid for only 5 minutes.
                <br/><br/>
                Thanks,
                Snapbill`

        };
        return transporter.sendMail(mailOptions);
    }
}

module.exports = controller;
