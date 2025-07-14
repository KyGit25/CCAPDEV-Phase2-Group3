const Reservation = require('../models/Reservation');
const Lab = require('../models/Lab');
const User = require('../models/User');

exports.createReservation = async (req, res) => {
  try {
    const { labId, selectedDate, selectedTime, selectedSeats, isAnonymous } = req.body;

    if (!labId || !selectedDate || !selectedTime || !selectedSeats) {
      return res.status(400).send('Missing required fields');
    }

    const seatNumbers = selectedSeats.split(',').map(Number);

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); 

    const existingReservations = await Reservation.find({
      lab: labId,
      seatNumber: { $in: seatNumbers },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    });

    if (existingReservations.length > 0) {
      return res.status(400).send('One or more seats are already reserved for this time slot');
    }

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


exports.viewReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('lab')
      .populate('user');

    if (!reservation) {
      return res.status(404).send('Reservation not found');
    }

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


exports.reserveForStudent = async (req, res) => {
  try {
    if (req.session.role !== 'technician') {
      return res.status(403).send('Access denied');
    }

    const { studentEmail, labId, selectedDate, selectedTime, selectedSeats } = req.body;

    const student = await User.findOne({ email: studentEmail, role: 'student' });
    if (!student) {
      return res.status(400).send('Student not found');
    }

    const seatNumbers = selectedSeats.split(',').map(Number);
    

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);


    const existingReservations = await Reservation.find({
      lab: labId,
      seatNumber: { $in: seatNumbers },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    });

    if (existingReservations.length > 0) {
      return res.status(400).send('One or more seats are already reserved for this time slot');
    }


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


exports.removeReservation = async (req, res) => {
  try {
    if (req.session.role !== 'technician') {
      return res.status(403).send('Access denied');
    }

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).send('Reservation not found');
    }


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

exports.getReserveForm = async (req, res) => {
  try {
    const labId = req.params.labId;
    const lab = await Lab.findById(labId);
    
    if (!lab) {
      return res.status(404).send('Lab not found');
    }
    
    const selectedDate = req.query.date || new Date().toISOString().split('T')[0];
    const selectedTime = req.query.time || '09:00';
    
    // Generate time slots
    const timeSlots = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        timeSlots.push({
          value: timeValue,
          label: `${timeValue} - ${hour === 17 && minute === 30 ? '18:00' : (minute === 30 ? (hour + 1).toString().padStart(2, '0') + ':00' : hour.toString().padStart(2, '0') + ':30')}`,
          selected: timeValue === selectedTime
        });
      }
    }
    
    const today = new Date().toISOString().split('T')[0];
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    const maxDateStr = maxDate.toISOString().split('T')[0];
    
    res.render('reservation/reserve', {
      lab,
      selectedDate,
      selectedTime,
      timeSlots,
      today,
      maxDate: maxDateStr,
      title: `Reserve - ${lab.name}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading reservation form');
  }
};
