const router = require("express").Router();
const { protect } = require("../middleware/auth.middleware");
const stats = require("../controllers/stats.controller");
const { validateStatsRange } = require("../validators/stats.validator");

router.get("/habits/:habitId/stats", protect, validateStatsRange, stats.getHabitStats);
router.get("/stats/overview", protect, validateStatsRange, stats.getOverview);

module.exports = router;