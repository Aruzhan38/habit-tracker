const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const reminders = require("../controllers/reminders.controller");
const { validateCreateReminder } = require("../validators/reminder.validator");

router.post("/habits/:habitId/reminders", auth, validateCreateReminder, reminders.createReminder);
router.get("/habits/:habitId/reminders", auth, reminders.getReminders);
router.delete("/habits/:habitId/reminders/:reminderId", auth, reminders.deleteReminder);

module.exports = router;