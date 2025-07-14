const User = require('../models/User');
const Reservation = require('../models/Reservation');

/**
 * View current user's profile
 */
exports.viewOwnProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const reservations = await Reservation.find({ user: user._id })
      .populate('lab')
      .sort({ startTime: -1 });

    res.render('profile/view', { 
      user, 
      reservations,
      title: 'My Profile',
      isOwnProfile: true
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading profile');
  }
};

/**
 * View another user's public profile
 */
exports.viewPublicProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send('User not found');

    const reservations = await Reservation.find({ 
      user: user._id, 
      isAnonymous: false 
    }).populate('lab').sort({ startTime: -1 });

    res.render('profile/view', { 
      user, 
      reservations, 
      title: `${user.email}'s Profile`,
      isPublic: true,
      isOwnProfile: false
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading public profile');
  }
};

/**
 * Render edit profile page
 */
exports.getEditProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    res.render('profile/edit', { 
      user,
      title: 'Edit Profile'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading edit page');
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
  const { description, anonymous } = req.body;

  try {
    await User.findByIdAndUpdate(req.session.userId, {
      description,
      anonymous: anonymous === 'on'
    });

    res.redirect('/profile/view?success=Profile updated successfully');
  } catch (err) {
    console.error(err);
    res.render('profile/edit', {
      user: await User.findById(req.session.userId),
      title: 'Edit Profile',
      error: 'Update failed'
    });
  }
};

/**
 * Delete user and reservations
 */
exports.deleteProfile = async (req, res) => {
  try {
    const userId = req.session.userId;

    // Cancel all future reservations
    await Reservation.deleteMany({ user: userId });
    
    // Delete user account
    await User.findByIdAndDelete(userId);

    req.session.destroy(() => {
      res.redirect('/auth/login?message=Account deleted successfully');
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Delete failed');
  }
};
