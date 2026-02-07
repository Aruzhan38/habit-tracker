const { sendGmail } = require("./gmail.service");

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildReminderHtml({ username, habitName, time, note }) {
  const safeHabit = escapeHtml(habitName);
  const safeUser = escapeHtml(username);
  const safeTime = escapeHtml(time);
  const safeNote = escapeHtml(note || "");

  return `
    <div style="background:#f6f7fb;padding:24px;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;
                  box-shadow:0 6px 24px rgba(0,0,0,0.08);overflow:hidden;">
        <div style="padding:18px 22px;background:linear-gradient(90deg,#6d28d9,#7c3aed);color:#fff;">
          <div style="font-size:14px;opacity:.9;">Habit Tracker</div>
          <div style="font-size:20px;font-weight:700;margin-top:6px;">⏰ Habit reminder</div>
        </div>

        <div style="padding:22px;color:#111827;">
          <div style="font-size:16px;font-weight:600;margin-bottom:10px;">
            Hi${safeUser ? `, ${safeUser}` : ""} 👋
          </div>

          <div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px;">
            <div style="font-size:12px;color:#6b7280;">Habit</div>
            <div style="font-size:16px;font-weight:700;margin:2px 0 10px;">${safeHabit}</div>

            <div style="font-size:12px;color:#6b7280;">Scheduled time</div>
            <div style="font-size:14px;font-weight:600;margin-top:2px;">${safeTime}</div>

            ${
              safeNote
                ? `<div style="margin-top:12px;font-size:13px;color:#374151;background:#f3f4f6;border-radius:10px;padding:10px;">
                     <b>Note:</b> ${safeNote}
                   </div>`
                : ""
            }
          </div>

          <div style="margin-top:18px;font-size:12px;color:#6b7280;">
            You’re receiving this email because reminders are enabled in your account.
          </div>
        </div>
      </div>
    </div>`;
}

async function sendReminderEmail({ to, username, habitName, time, note }) {
  const subject = `Reminder: ${habitName}`;
  const html = buildReminderHtml({ username, habitName, time, note });

  await sendGmail({ to, subject, html });
}

module.exports = { sendReminderEmail };