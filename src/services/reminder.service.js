const mongoose = require("mongoose");
const Habit = require("../models/habit");

function assertObjectId(id, name) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error(`Invalid ${name}`);
    err.status = 400;
    throw err;
  }
}

async function getOwnedHabitOrThrow(habitId, userId, select = "") {
  const habit = await Habit.findOne({ _id: habitId, user: userId }).select(select);
  if (!habit) {
    const err = new Error("Habit not found");
    err.status = 404;
    throw err;
  }
  return habit;
}

async function createReminder({ habitId, userId, payload }) {
  assertObjectId(habitId, "habitId");
  const habit = await getOwnedHabitOrThrow(habitId, userId);

  habit.reminders.push(payload);
  await habit.save();

  return habit.reminders[habit.reminders.length - 1];
}

async function listReminders({ habitId, userId }) {
  assertObjectId(habitId, "habitId");
  const habit = await getOwnedHabitOrThrow(habitId, userId, "reminders");
  return habit.reminders;
}

async function deleteReminder({ habitId, reminderId, userId }) {
  assertObjectId(habitId, "habitId");
  assertObjectId(reminderId, "reminderId");

  const habit = await getOwnedHabitOrThrow(habitId, userId);

  const before = habit.reminders.length;
  habit.reminders = habit.reminders.filter((r) => r._id.toString() !== reminderId);

  if (habit.reminders.length === before) {
    const err = new Error("Reminder not found");
    err.status = 404;
    throw err;
  }

  await habit.save();
  return true;
}

module.exports = {
  createReminder,
  listReminders,
  deleteReminder,
};