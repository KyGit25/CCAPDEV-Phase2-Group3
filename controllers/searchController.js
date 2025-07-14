const Reservation = require('../models/Reservation');
const Lab = require('../models/Lab');
const User = require('../models/User');

/**
 * Search available slots for a lab on a given date and time
 */
exports.searchFreeSlots = async (req, res) => {
  const { labId, date, time } = req.query;

  try {
    // Always load labs for the search form
    const labs = await Lab.find();

    if (!labId || !date || !time) {
      return res.render('reservation/search', {
        labs,
        title: 'Search Available Slots'
      });
    }

    const lab = await Lab.findById(labId);
    if (!lab) return res.status(404).send('Lab not found');

    const targetStart = new Date(`${date}T${time}:00`);
    const targetEnd = new Date(targetStart.getTime() + 30 * 60 * 1000);

    const reservedSeats = await Reservation.find({
      lab: labId,
      startTime: targetStart,
      endTime: targetEnd
    }).distinct('seatNumber');

    const availableSeats = lab.seats.filter(seat => !reservedSeats.includes(seat));

    res.render('reservation/search', {
      labs,
      lab,
      date,
      time,
      availableSeats,
      title: 'Search Available Slots'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Slot search failed');
  }
};

/**
 * Search users by email/name (technician only)
 */
exports.searchUsers = async (req, res) => {
  const query = req.query.q;

  try {
    const labs = await Lab.find();
    
    if (!query) {
      return res.render('reservation/search', { 
        labs, 
        users: [],
        title: 'Search Users' 
      });
    }

    const users = await User.find({
      $or: [
        { email: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    });

    res.render('reservation/search', { 
      labs, 
      users,
      title: 'Search Users' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('User search failed');
  }
};
