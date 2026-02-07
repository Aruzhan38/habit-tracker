require("dotenv").config();
const { sendGmail } = require("./gmail.service");

(async () => {
  try {
    await sendGmail({
      to: "boranova2007@mail.ru",
      subject: "✅ Gmail SMTP работает",
      html: "<h2>Hello 👋</h2><p>This email was sent via Gmail SMTP</p>",
    });
    console.log("✅ Email sent");
  } catch (e) {
    console.error("❌ Email error:", e.message);
  }
})();