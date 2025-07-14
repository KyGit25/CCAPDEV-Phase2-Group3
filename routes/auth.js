const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// GET login/register pages
router.get('/login', authController.getLogin);
router.get('/register', authController.getRegister);

// POST register/login
router.post('/register', authController.postRegister);
router.post('/login', authController.postLogin);

// GET logout
router.get('/logout', authController.logout);

module.exports = router;
