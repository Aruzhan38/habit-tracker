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

exports.replaceReminders = async (req, res, next) => {
  try {
    const { habitId } = req.params;

    const habit = await Habit.findOne({ _id: habitId, user: req.user.id });
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    const incoming = req.body;

    let list = [];
    if (Array.isArray(incoming)) list = incoming;
    else if (Array.isArray(incoming.reminders)) list = incoming.reminders;
    else if (incoming && typeof incoming === "object") list = [incoming];

    const normalized = list.map(normReminder).filter(Boolean);

    habit.reminders = normalized; // overwrite
    await habit.save();

    res.json({ reminders: habit.reminders });
  } catch (e) {
    next(e);
  }
}

module.exports = { createReminder, getReminders, deleteReminder, replaceReminders };