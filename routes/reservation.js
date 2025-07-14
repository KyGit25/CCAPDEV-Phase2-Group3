const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');

// Create reservation (POST)
router.post('/create', reservationController.createReservation);

// Edit reservation (POST)
router.post('/:id/edit', reservationController.editReservation);

// Delete reservation (GET or POST)
router.get('/:id/delete', reservationController.deleteReservation);

// View user's reservations (GET)
router.get('/my', reservationController.viewMyReservations);

module.exports = router;
