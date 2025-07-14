const Lab = require('../models/Lab');
const Reservation = require('../models/Reservation');
const User = require('../models/User');

/**
 * Show all labs with basic info
 */
exports.listLabs = async (req, res) => {
  try {
    const labs = await Lab.find();
    res.render('lab/list', { labs, title: 'Computer Labs' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading labs');
  }
};

/**
 * View availability for a specific lab on a specific day
 */
exports.getLabAvailability = async (req, res) => {
  try {
    const labId = req.params.id;
    const dateQuery = req.query.date
      ? new Date(req.query.date)
      : new Date();
    const timeQuery = req.query.time || '09:00';

    const startOfDay = new Date(dateQuery.setHours(0, 0, 0, 0));
    const endOfDay = new Date(dateQuery.setHours(23, 59, 59, 999));

    const lab = await Lab.findById(labId);
    if (!lab) return res.status(404).send('Lab not found');

    const reservations = await Reservation.find({
      lab: labId,
      startTime: { $gte: startOfDay, $lte: endOfDay }
    }).populate('user');

    const reservationMap = {};
    for (const resv of reservations) {
      const key = `${resv.seatNumber}-${resv.startTime.toISOString()}`;
      reservationMap[key] = {
        reservedBy: resv.isAnonymous ? 'Anonymous' : resv.user.email,
        userId: resv.isAnonymous ? null : resv.user._id
      };
    }

    res.render('lab/availability', {
      lab,
      reservations: reservationMap,
      date: startOfDay.toISOString().split('T')[0],
      time: timeQuery,
      title: `${lab.name} - Availability`
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading availability');
  }
};
