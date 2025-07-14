const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');

// Create reservation (POST)
router.post('/reserve', reservationController.createReservation);

// Get user's reservations
router.get('/my', reservationController.getUserReservations);

// Get all reservations (technician only)
router.get('/all', reservationController.getAllReservations);

// View single reservation
router.get('/view/:id', reservationController.viewReservation);

// Edit reservation routes
router.get('/edit/:id', reservationController.getEditReservation);
router.post('/edit/:id', reservationController.editReservation);

// Reserve for student (technician only)
router.post('/reserve-for-student', reservationController.reserveForStudent);

// Remove reservation (technician only)
router.post('/remove/:id', reservationController.removeReservation);

// Delete reservation
router.post('/delete/:id', reservationController.deleteReservation);

module.exports = router;
