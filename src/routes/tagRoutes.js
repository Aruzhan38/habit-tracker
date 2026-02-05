const express = require("express");
const router = express.Router();
const tagController = require("../controllers/tag.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/", protect, tagController.createTag);
router.get("/", protect, tagController.getTags);
router.post("/habits/:habitId/tags/:tagId", protect, tagController.assignTagToHabit);

module.exports = router;