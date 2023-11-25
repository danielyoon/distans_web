const nodemailer = require("nodemailer");

module.exports = sendEmail;

async function sendEmail({ to, subject, html, from = process.env.EMAIL_FROM }) {
  const smtpOptions = JSON.parse(process.env.SMTP_OPTIONS);
  const transporter = nodemailer.createTransport(smtpOptions);
  await transporter.sendMail({ from, to, subject, html });
}
