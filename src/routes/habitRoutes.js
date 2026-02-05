const express = require('express');
const router = express.Router();

const habitController = require('../controllers/habit.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/', protect, habitController.createHabit);
router.get('/', protect, habitController.getHabits);

router.get('/:habitId', protect, habitController.getHabitById);
router.patch('/:habitId', protect, habitController.updateHabit);
router.delete('/:habitId', protect, habitController.deleteHabit);

router.post('/:habitId/archive', protect, habitController.archiveHabit);
router.post('/:habitId/unarchive', protect, habitController.unarchiveHabit);

//check-ins 

router.post("/:habitId/checkins", protect, habitController.addCheckIn);
router.get("/:habitId/checkins", protect, habitController.getCheckIns);
router.delete("/:habitId/checkins/:checkInId", protect, habitController.deleteCheckIn);
router.put("/:habitId/checkins/:date", protect, habitController.upsertCheckInByDate);
router.delete("/:habitId/checkins/:date", protect, habitController.deleteCheckInByDate);

module.exports = router;