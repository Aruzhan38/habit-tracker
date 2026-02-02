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

module.exports = router;