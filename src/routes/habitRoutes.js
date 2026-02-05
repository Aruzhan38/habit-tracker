const express = require('express');
const router = express.Router();

const habitController = require('../controllers/habit.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/habits', protect, habitController.createHabit);
router.get('/habits', protect, habitController.getHabits);
router.get('/habits/:habitId', protect, habitController.getHabitById);
router.patch('/habits/:habitId', protect, habitController.updateHabit);
router.delete('/habits/:habitId', protect, habitController.deleteHabit);
router.post('/habits/:habitId/archive', protect, habitController.archiveHabit);
router.post('/habits/:habitId/unarchive', protect, habitController.unarchiveHabit);
//check-ins 

router.post("/habits/:habitId/checkins", protect, habitController.addCheckIn);
router.get("/habits/:habitId/checkins", protect, habitController.getCheckIns);
router.delete("/habits/:habitId/checkins/:checkInId", protect, habitController.deleteCheckIn);
router.put("/habits/:habitId/checkins/:date", protect, habitController.upsertCheckInByDate);
router.delete("/habits/:habitId/checkins/:date", protect, habitController.deleteCheckInByDate);

module.exports = router;