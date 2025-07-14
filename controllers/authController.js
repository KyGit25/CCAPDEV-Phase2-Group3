const User = require('../models/User');

/**
 * Render login page
 */
exports.getLogin = (req, res) => {
  res.render('auth/login', { 
    title: 'Login',
    isAuth: true 
  });
};

/**
 * Render registration page
 */
exports.getRegister = (req, res) => {
  res.render('auth/register', { 
    title: 'Register',
    isAuth: true 
  });
};

/**
 * Register a new user
 */
exports.postRegister = async (req, res) => {
  const { email, password, confirmPassword, role, description } = req.body;

  // Validation
  if (!email || !password || !role) {
    return res.render('auth/register', {
      title: 'Register',
      isAuth: true,
      error: 'Please fill in all required fields'
    });
  }

  if (password !== confirmPassword) {
    return res.render('auth/register', {
      title: 'Register',
      isAuth: true,
      error: 'Passwords do not match'
    });
  }

  if (!email.endsWith('@dlsu.edu.ph')) {
    return res.render('auth/register', {
      title: 'Register',
      isAuth: true,
      error: 'Please use a valid DLSU email address'
    });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.render('auth/register', {
        title: 'Register',
        isAuth: true,
        error: 'Email already registered'
      });
    }

    const user = new User({ email, password, role, description });
    await user.save();

    req.session.userId = user._id;
    req.session.role = user.role;

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.render('auth/register', {
      title: 'Register',
      isAuth: true,
      error: 'Server error during registration'
    });
  }
};

/**
 * Login user
 */
exports.postLogin = async (req, res) => {
  const { email, password, remember } = req.body;

  if (!email || !password) {
    return res.render('auth/login', {
      title: 'Login',
      isAuth: true,
      error: 'Please fill in all fields'
    });
  }

  try {
    const user = await User.findOne({ email, password });
    if (!user) {
      return res.render('auth/login', {
        title: 'Login',
        isAuth: true,
        error: 'Invalid credentials'
      });
    }

    req.session.userId = user._id;
    req.session.role = user.role;

    if (remember) {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 21; // 3 weeks
    }

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.render('auth/login', {
      title: 'Login',
      isAuth: true,
      error: 'Login error'
    });
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
