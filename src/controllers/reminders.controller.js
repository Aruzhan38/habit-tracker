const reminderService = require("../services/reminder.service");

async function createReminder(req, res, next) {
  try {
    const reminder = await reminderService.createReminder({
      habitId: req.params.habitId,
      userId: req.user.id,
      payload: req.body,
    });

    res.status(201).json({ message: "Reminder created", reminder });
  } catch (err) {
    next(err);
  }
}

async function getReminders(req, res, next) {
  try {
    const reminders = await reminderService.listReminders({
      habitId: req.params.habitId,
      userId: req.user.id,
    });

    res.json({ habitId: req.params.habitId, reminders });
  } catch (err) {
    next(err);
  }
}

async function deleteReminder(req, res, next) {
  try {
    await reminderService.deleteReminder({
      habitId: req.params.habitId,
      reminderId: req.params.reminderId,
      userId: req.user.id,
    });

    res.json({ message: "Reminder deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = { createReminder, getReminders, deleteReminder };