const cron = require("node-cron");
const Habit = require("../models/habit");
const User = require("../models/user");
const { sendReminderEmail } = require("./reminderEmail.service");

function hhmm(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function shouldSendToday(reminder, day) {
  const days = Array.isArray(reminder.daysOfWeek) ? reminder.daysOfWeek : [];
  return days.length === 0 || days.includes(day);
}

function nowInTimeZone(timeZone) {
  try {
    const s = new Date().toLocaleString("en-US", { timeZone });
    return new Date(s);
  } catch {
    const s = new Date().toLocaleString("en-US", { timeZone: "UTC" });
    return new Date(s);
  }
}

function startReminderCron() {
  cron.schedule("* * * * *", async () => {
    try {
      const habits = await Habit.find({
        "reminders.enabled": true,
      }).select("name user reminders");

      console.log(`[CRON] tick: habits with reminders=${habits.length}`);

      for (const habit of habits) {
        const user = await User.findById(habit.user).select("email username timezone");
        if (!user?.email) continue;

        const tz = user.timezone || "UTC";
        const nowTz = nowInTimeZone(tz);
        const timeNow = hhmm(nowTz);
        const day = nowTz.getDay(); 

        let changed = false;

        for (const r of habit.reminders) {
          if (!r.enabled) continue;
          if (r.time !== timeNow) continue;
          if (!shouldSendToday(r, day)) continue;

          if (r.lastSentAt) {
            const diff = Date.now() - new Date(r.lastSentAt).getTime();
            if (diff < 55 * 1000) continue;
          }

          console.log(
            `[CRON] SEND -> to=${user.email} tz=${tz} now=${timeNow} habit="${habit.name}" reminder=${r.time}`
          );

          await sendReminderEmail({
            to: user.email,
            username: user.username || "",
            habitName: habit.name,
            time: r.time,
            note: r.note || "",
          });

          r.lastSentAt = new Date();
          changed = true;

          console.log(`[CRON] SENT OK -> ${user.email}`);
        }

        if (changed) await habit.save();
      }
    } catch (err) {
      console.error("Reminder cron error:", err);
    }
  });
}

module.exports = { startReminderCron };