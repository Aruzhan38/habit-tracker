const express = require("express");
const router = express.Router();

const billingController = require("../controllers/billing.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/cards", protect, billingController.getCards);
router.post("/cards", protect, billingController.addCard);
router.delete("/cards/:cardId", protect, billingController.deleteCard);

module.exports = router;