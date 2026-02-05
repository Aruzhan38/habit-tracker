const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

router.get('/me', protect, userController.getMe);
router.patch('/me', protect, userController.updateMe);

router.post('/me/avatar', protect, upload.single('avatar'), userController.uploadAvatar);

module.exports = router;