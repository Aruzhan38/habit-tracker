const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const statsController = require("../controllers/stats.controller");

router.get("/overview", protect, statsController.getOverview);
router.get("/calendar", protect, statsController.getCalendar);

module.exports = router;