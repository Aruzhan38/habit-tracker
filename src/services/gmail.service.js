const nodemailer = require("nodemailer");
console.log("GMAIL_USER:", process.env.GMAIL_USER);
console.log("GMAIL_PASS:", process.env.GMAIL_PASS ? "SET" : "MISSING");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

async function sendGmail({ to, subject, html }) {
  return transporter.sendMail({
    from: `"Habit Tracker" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

module.exports = { sendGmail };