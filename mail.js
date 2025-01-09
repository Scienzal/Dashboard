const nodemailer = require('nodemailer');

const { env } = process;

let transporter = nodemailer.createTransport({
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: false, // upgrade later with STARTTLS
    auth: {
      user: env.MAIL_USER,
      pass: env.MAIL_PASS,
    },
}, {
    from: env.MAIL_FROM
});

module.exports = transporter;