const Reservation = require('../models/Reservation');
const Lab = require('../models/Lab');
const User = require('../models/User');

/**
 * Create reservation (student or technician)
 */
exports.createReservation = async (req, res) => {
  try {
    const { labId, selectedDate, selectedTime, selectedSeats, isAnonymous } = req.body;

    if (!labId || !selectedDate || !selectedTime || !selectedSeats) {
      return res.status(400).send('Missing required fields');
    }

    // Parse selected seats
    const seatNumbers = selectedSeats.split(',').map(Number);
    
    // Parse date and time into start and end times
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // Add 30 minutes

    // Check if any seat is already reserved
    const existingReservations = await Reservation.find({
      lab: labId,
      seatNumber: { $in: seatNumbers },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    });

    if (existingReservations.length > 0) {
      return res.status(400).send('One or more seats are already reserved for this time slot');
    }

    // Create reservations for all selected seats
    const reservations = seatNumbers.map(seatNumber => ({
      user: req.session.userId,
      lab: labId,
      seatNumber: seatNumber,
      startTime: startTime,
      endTime: endTime,
      isAnonymous: isAnonymous === 'on'
    }));

    await Reservation.insertMany(reservations);

    res.redirect('/reservation/my?success=Reservation created successfully');
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

/**
 * Get user's reservations
 */
exports.getUserReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({ user: req.session.userId })
      .populate('lab')
      .sort({ startTime: -1 });

    res.render('reservation/my', {
      reservations,
      title: 'My Reservations',
      success: req.query.success
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading reservations');
  }
};

/**
 * Get all reservations (for technicians)
 */
exports.getAllReservations = async (req, res) => {
  try {
    if (req.session.role !== 'technician') {
      return res.status(403).send('Access denied');
    }

    const reservations = await Reservation.find()
      .populate('lab')
      .populate('user')
      .sort({ startTime: -1 });

    res.render('reservation/all', {
      reservations,
      title: 'All Reservations'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading reservations');
  }
};

/**
 * View single reservation
 */
exports.viewReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('lab')
      .populate('user');

    if (!reservation) {
      return res.status(404).send('Reservation not found');
    }

    // Check if user can view this reservation
    const isOwner = reservation.user._id.toString() === req.session.userId;
    const isTech = req.session.role === 'technician';
    
    if (!isOwner && !isTech) {
      return res.status(403).send('Access denied');
    }

    res.render('reservation/view', {
      reservation,
      title: 'Reservation Details'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading reservation');
  }
};

/**
 * Reserve for student (technician only)
 */
exports.reserveForStudent = async (req, res) => {
  try {
    if (req.session.role !== 'technician') {
      return res.status(403).send('Access denied');
    }

    const { studentEmail, labId, selectedDate, selectedTime, selectedSeats } = req.body;

    // Find the student
    const student = await User.findOne({ email: studentEmail, role: 'student' });
    if (!student) {
      return res.status(400).send('Student not found');
    }

    // Parse selected seats
    const seatNumbers = selectedSeats.split(',').map(Number);
    
    // Parse date and time into start and end times
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    // Check if any seat is already reserved
    const existingReservations = await Reservation.find({
      lab: labId,
      seatNumber: { $in: seatNumbers },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    });

    if (existingReservations.length > 0) {
      return res.status(400).send('One or more seats are already reserved for this time slot');
    }

    // Create reservations for all selected seats
    const reservations = seatNumbers.map(seatNumber => ({
      user: student._id,
      lab: labId,
      seatNumber: seatNumber,
      startTime: startTime,
      endTime: endTime,
      isAnonymous: false
    }));

    await Reservation.insertMany(reservations);

    res.redirect('/reservation/all?success=Reservation created for student');
  } catch (err) {
    console.error(err);
    res.status(500).send('Reservation failed');
  }
};

/**
 * Remove reservation (technician only, with 10-min grace period)
 */
exports.removeReservation = async (req, res) => {
  try {
    if (req.session.role !== 'technician') {
      return res.status(403).send('Access denied');
    }

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).send('Reservation not found');
    }

    // Check if within 10-minute grace period
    const now = new Date();
    const reservationTime = new Date(reservation.startTime);
    const timeDiff = now - reservationTime;
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));

    if (minutesDiff > 10) {
      return res.status(400).send('Cannot remove reservation: 10-minute grace period has expired');
    }

    await Reservation.findByIdAndDelete(req.params.id);

    res.redirect('/reservation/all?success=Reservation removed successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error removing reservation');
  }
};
