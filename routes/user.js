
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// View own profile
router.get('/', userController.viewOwnProfile);

// View another user's public profile
router.get('/:id/public', userController.viewPublicProfile);

// Edit profile (GET and POST)
router.get('/edit', userController.getEditProfile);
router.post('/edit', userController.updateProfile);

// Delete profile
router.get('/delete', userController.deleteProfile);

module.exports = router;
