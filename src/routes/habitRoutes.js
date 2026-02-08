const express = require('express');
const router = express.Router();

const habitController = require('../controllers/habit.controller');
const tagController = require('../controllers/tag.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/daily', protect, habitController.getDailyView);
router.get('/calendar', protect, habitController.getCalendarMap);

router.post('/', protect, habitController.createHabit);
router.get('/', protect, habitController.getHabits);

router.get('/:habitId', protect, habitController.getHabitById);
router.patch('/:habitId', protect, habitController.updateHabit);
router.delete('/:habitId', protect, habitController.deleteHabit);

router.post('/:habitId/archive', protect, habitController.archiveHabit);
router.post('/:habitId/unarchive', protect, habitController.unarchiveHabit);

// tags
router.post('/:habitId/tags/:tagId', protect, tagController.assignTagToHabit);


// check-ins
router.post("/:habitId/checkins", protect, habitController.addCheckIn);
router.get("/:habitId/checkins", protect, habitController.getCheckIns);

router.put("/:habitId/checkins/:date", protect, habitController.upsertCheckInByDate);
router.delete("/:habitId/checkins/:date", protect, habitController.deleteCheckInByDate);

router.delete("/:habitId/checkins/:checkInId", protect, habitController.deleteCheckIn);

module.exports = router;
