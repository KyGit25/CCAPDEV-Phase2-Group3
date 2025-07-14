const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const searchController = require('../controllers/searchController');

router.post('/reserve', reservationController.createReservation);

router.get('/my', reservationController.getUserReservations);

router.get('/all', reservationController.getAllReservations);

router.get('/view/:id', reservationController.viewReservation);

router.get('/edit/:id', reservationController.getEditReservation);
router.post('/edit/:id', reservationController.editReservation);

router.post('/reserve-for-student', reservationController.reserveForStudent);

router.post('/remove/:id', reservationController.removeReservation);

router.post('/delete/:id', reservationController.deleteReservation);

router.get('/search', searchController.searchFreeSlots);

module.exports = router;
