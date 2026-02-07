const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const statsController = require("../controllers/stats.controller");

router.get("/habit/:habitId/overview", protect, statsController.overview);
router.get("/habit/:habitId/calendar", protect, statsController.calendar);
router.get("/habit/:habitId/history", protect, statsController.history);
router.get("/habit/:habitId/streaks", protect, statsController.streaks);
router.get("/habit/:habitId/trend", protect, statsController.trend);

module.exports = router;