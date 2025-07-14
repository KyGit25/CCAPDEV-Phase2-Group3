const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// Search available slots
router.get('/slots', searchController.searchFreeSlots);

// Search users
router.get('/users', searchController.searchUsers);

module.exports = router;
