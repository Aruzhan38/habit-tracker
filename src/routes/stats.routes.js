const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const stats = require("../controllers/stats.controller");
const { validateStatsRange } = require("../validators/stats.validator");

router.get("/habits/:habitId/stats", auth, validateStatsRange, stats.getHabitStats);
router.get("/stats/overview", auth, validateStatsRange, stats.getOverview);

module.exports = router;