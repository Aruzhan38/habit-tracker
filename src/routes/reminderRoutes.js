const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth.middleware");
const reminders = require("../controllers/reminders.controller");
const { validateCreateReminder } = require("../validators/reminder.validator");

router.post(
  "/habits/:habitId/reminders",
  protect,
  validateCreateReminder,
  reminders.createReminder
);

router.get(
  "/habits/:habitId/reminders",
  protect,
  reminders.getReminders
);

router.delete(
  "/habits/:habitId/reminders/:reminderId",
  protect,
  reminders.deleteReminder
);

router.post("/reminders/habits/:habitId/reminders", protect, reminders.createReminder);
router.put("/reminders/habits/:habitId/reminders", protect, reminders.replaceReminders);

module.exports = router;