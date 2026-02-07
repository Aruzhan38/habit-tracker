const { sendGmail } = require("./gmail.service");

async function sendEmail({ to, subject, html }) {
  console.log("📨 Sending email (GMAIL):", { to, subject });
  return sendGmail({ to, subject, html });
}

module.exports = { sendEmail };