const Reservation = require('../models/Reservation');
const Lab = require('../models/Lab');
const User = require('../models/User');

/**
 * Create reservation (student or technician)
 */
exports.createReservation = async (req, res) => {
  try {
    const { labId, seatNumber, date, time, isAnonymous } = req.body;

    // Parse date and time into start and end times
    const startTime = new Date(`${date}T${time}:00`);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // Add 30 minutes

    // Check if seat is already reserved
    const existingReservation = await Reservation.findOne({
      lab: labId,
      seatNumber: seatNumber,
      startTime: startTime,
      endTime: endTime
    });

    if (existingReservation) {
      return res.status(400).send('Seat is already reserved for this time slot');
    }

    // Create reservation
    const reservation = new Reservation({
      user: req.session.userId,
      lab: labId,
      seatNumber: seatNumber,
      startTime: startTime,
      endTime: endTime,
      isAnonymous: isAnonymous === 'on'
    });

    await reservation.save();

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Reservation failed');
  }
};

exports.getEditReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('lab')
      .lean();

    if (!reservation) return res.status(404).send('Reservation not found');

    // Format dates for HTML inputs
    reservation.startTimeISO = reservation.startTime.toISOString().slice(0, 16);
    reservation.endTimeISO = reservation.endTime.toISOString().slice(0, 16);

    res.render('reservation/edit', {
      reservation,
      labs: await Lab.find(),
      user: { _id: req.session.userId, userType: req.session.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

/**
 * Edit reservation (student or technician)
 */
exports.editReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { seatNumber, startTime } = req.body;

    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).send('Not found');

    const isOwner = reservation.user.toString() === req.session.userId;
    const isTech = req.session.role === 'technician';
    if (!isOwner && !isTech) return res.status(403).send('Forbidden');

    reservation.seatNumber = seatNumber;
    reservation.startTime = new Date(startTime);
    reservation.endTime = new Date(reservation.startTime.getTime() + 30 * 60 * 1000);
    await reservation.save();

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Edit failed');
  }
};

/**
 * Delete reservation (by student or technician with 10-min grace)
 */
exports.deleteReservation = async (req, res) => {
  try {
    const { id } = req.params;

    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).send('Not found');

    const now = new Date();
    const isOwner = reservation.user.toString() === req.session.userId;
    const isTech = req.session.role === 'technician';
    const withinGrace = now >= reservation.startTime && now <= new Date(reservation.startTime.getTime() + 10 * 60 * 1000);

    if (!isOwner && !(isTech && withinGrace)) return res.status(403).send('Not authorized');

    await Reservation.deleteMany({ user: reservation.user, startTime: reservation.startTime });
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Delete failed');
  }
};

/**
 * View reservations for logged-in user
 */
exports.viewMyReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({ user: req.session.userId })
      .populate('lab')
      .sort({ startTime: 1 });
    
    res.render('reservation/my', { 
      reservations,
      title: 'My Reservations' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading reservations');
  }
};
