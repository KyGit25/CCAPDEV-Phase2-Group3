const express = require('express');
const { engine } = require('express-handlebars');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lab_reservation';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Handlebars engine setup
app.engine('hbs', engine({
  defaultLayout: 'main',
  extname: '.hbs',
  partialsDir: path.join(__dirname, 'views/partials'),
  layoutsDir: path.join(__dirname, 'views/layouts'),
  helpers: {
    eq: function (a, b) {
      return a === b;
    }
  }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'lab-reservation-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 1000 * 60 * 60 * 24 // 24 hours default
  }
}));

// Global middleware to make user session available in views
app.use((req, res, next) => {
  res.locals.user = req.session.userId ? { 
    id: req.session.userId, 
    role: req.session.role 
  } : null;
  next();
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
};

// Routes
app.get('/', (req, res) => {
  res.render('dashboard', { title: 'Dashboard' });
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard', { title: 'Dashboard' });
});

const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

const labRoutes = require('./routes/lab');
app.use('/lab', requireAuth, labRoutes);

const reservationRoutes = require('./routes/reservation');
app.use('/reservation', requireAuth, reservationRoutes);

const userRoutes = require('./routes/user');
app.use('/profile', requireAuth, userRoutes);

const searchRoutes = require('./routes/search');
app.use('/search', requireAuth, searchRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: 'Server Error',
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { 
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
