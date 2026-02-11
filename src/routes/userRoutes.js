const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

router.get('/me', protect, userController.getMe);
router.patch('/me', protect, userController.updateMe);
router.post('/me/avatar', protect, upload.single('avatar'), userController.uploadAvatar);
router.post("/upgrade", protect, userController.upgradePlan);
router.post("/downgrade", protect, userController.downgradePlan);
router.post("/billing/cards", protect, userController.addCard);

module.exports = router;