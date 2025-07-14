const express = require('express');
const router = express.Router();
const labController = require('../controllers/labController');

// List all labs
router.get('/', labController.listLabs);

// View specific lab availability
router.get('/:id/availability', labController.getLabAvailability);

module.exports = router;

