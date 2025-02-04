// app.js
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
     .then(() => console.log('MongoDB Connected'))
     .catch(err => console.error('MongoDB Connection Error:', err));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Session configuration
app.use(session({
     secret: process.env.SESSION_SECRET || 'your-secret-key',
     resave: false,
     saveUninitialized: false,
     cookie: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
     }
}));

// Flash messages
app.use(flash());

// Global variables middleware
app.use((req, res, next) => {
     res.locals.messages = {
          success: req.flash('success'),
          error: req.flash('error'),
          info: req.flash('info')
     };
     res.locals.user = req.user || null;
     res.locals.path = req.path; // For active navigation items
     next();
});

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
     const adminPassword = req.cookies.adminAuth;
     
     if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
          return res.status(401).render('auth/login', { // Fixed path to match actual view location
               title: 'Admin Login',
               error: 'Please login to access the admin dashboard'
          });
     }
     next();
};

// Routes
const adminRouter = require('./routes/adminRoutes');
const indexRouter = require('./routes/index');

// Admin login page
app.get('/admin/login', (req, res) => {
     // Pass any flash messages to the view
     const error = req.flash('error')[0];
     res.render('auth/login', {
          title: 'Admin Login',
          error: error
     });
});

// Admin login route
app.post('/admin/login', (req, res) => {
     const { password, rememberMe } = req.body; // Added rememberMe handling
     
     if (password === process.env.ADMIN_PASSWORD) {
          const cookieOptions = {
               httpOnly: true,
               secure: process.env.NODE_ENV === 'production',
               maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 30 days if remember me, else 24 hours
          };
          res.cookie('adminAuth', password, cookieOptions);
          // Set global isAdmin variable
          app.locals.isAdmin = true;
          res.redirect('/admin/dashboard');
     } else {
          req.flash('error', 'Invalid password');
          res.redirect('/admin/login');
     }
});

// Route usage - Move index router after admin routes to prevent conflicts
app.use('/admin', authenticateAdmin, adminRouter);
app.get('/admin', (req, res) => {
     res.redirect('/admin/dashboard');
});
app.use('/', indexRouter);

// 404 handler
app.use((req, res, next) => {
     res.status(404).render('error', {
          title: '404 Not Found',
          message: 'Page not found'
     });
});

// Error handler
app.use((err, req, res, next) => {
     console.error(err.stack);
     res.status(err.status || 500).render('error', {
          title: 'Error',
          message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
     });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
     console.log(`Server is running on port ${PORT}`);
});

module.exports = app;