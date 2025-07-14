const User = require('../models/User');

/**
 * Render login page
 */
exports.getLogin = (req, res) => {
  res.render('auth/login');
};

/**
 * Render registration page
 */
exports.getRegister = (req, res) => {
  res.render('auth/register');
};

/**
 * Register a new user
 */
exports.postRegister = async (req, res) => {
  const { email, password, role, description } = req.body;

  if (!email || !password || !role) {
    return res.status(400).send('Missing fields');
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).send('Email already registered');
    }

    const user = new User({ email, password, role, description });
    await user.save();

    req.session.userId = user._id;
    req.session.role = user.role;

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error during registration');
  }
};

/**
 * Login user
 */
exports.postLogin = async (req, res) => {
  const { email, password, remember } = req.body;

  try {
    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(401).send('Invalid credentials');
    }

    req.session.userId = user._id;
    req.session.role = user.role;

    if (remember) {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 21; // 3 weeks
    }

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Login error');
  }
};

/**
 * Logout user
 */
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
};
