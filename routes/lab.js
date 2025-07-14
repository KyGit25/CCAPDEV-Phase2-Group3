const express = require('express');
const router = express.Router();
const labController = require('../controllers/labController');

router.get('/', labController.listLabs);

router.get('/:id/availability', labController.getLabAvailability);

module.exports = router;

