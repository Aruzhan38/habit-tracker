const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth.middleware"); 
const statsController = require("../controllers/stats.controller");
const requirePremium = require("../middleware/requirePremium");

router.get("/overview", protect, statsController.getOverview);
router.get("/advanced", protect, requirePremium, statsController.getAdvanced);

module.exports = router;