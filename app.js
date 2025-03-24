// app.js
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const mongoose = require('mongoose');
const path = require('path');
const compression = require('compression');
const fileUpload = require('express-fileupload');
const { inject } = require('@vercel/analytics');
require('dotenv').config();

const app = express();

// Initialize Vercel Analytics
inject();

// Compression middleware
app.use(compression({
    level: 6, // compression level (0-9)
    threshold: 1024, // only compress responses above 1KB
    filter: (req, res) => {
        // don't compress responses with this request header
        if (req.headers['x-no-compression']) return false;
        // fallback to standard filter function
        return compression.filter(req, res);
    }
}));

// File Upload middleware
app.use(fileUpload({
    createParentPath: true,
    limits: { 
        fileSize: 10 * 1024 * 1024 // 10MB max file size
    },
    abortOnLimit: true,
    responseOnLimit: "File size limit has been reached",
    limitHandler: function (req, res, next) {
        return res.status(413).json({
            success: false,
            message: "File size limit has been reached (max 10MB)"
        });
    },
    useTempFiles: false,
    tempFileDir: '/tmp/',
    debug: process.env.NODE_ENV !== 'production'
}));

// Cache Control Middleware
// const cacheControl = (duration) => {
//     return (req, res, next) => {
//         if (req.method === 'GET') {
//             res.set('Cache-Control', `public, max-age=${duration}`);
//         } else {
//             res.set('Cache-Control', 'no-store');
//         }
//         next();
//     };
// };

// Static files caching configuration
const staticOptions = {
    dotfiles: 'ignore',
    etag: false, // Disable etag
    extensions: ['htm', 'html'],
    immutable: false, // Disable immutable
    lastModified: false, // Disable last-modified
    maxAge: 0, // Disable maxAge
    setHeaders: (res, path) => {
        // Disable caching for all static files
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '-1');
    }
};

// Essential middleware setup
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add no-cache middleware for all routes
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '-1');
    next();
});

// Serve static files with no caching
app.use('/images', express.static(path.join(__dirname, 'public/images'), staticOptions));
app.use('/css', express.static(path.join(__dirname, 'public/css'), staticOptions));
app.use('/js', express.static(path.join(__dirname, 'public/js'), staticOptions));
app.use('/fonts', express.static(path.join(__dirname, 'public/fonts'), staticOptions));
app.use(express.static(path.join(__dirname, 'public'), staticOptions));

// Comment out the cache control middleware
// app.use(cacheControl(86400)); // 24 hours default cache

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
     .then(() => console.log('MongoDB Connected'))
     .catch(err => console.error('MongoDB Connection Error:', err));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

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

// Import routes
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/adminRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const excursionRoutes = require('./routes/excursionRoutes');
const adminExcursionRoutes = require('./routes/admin/excursionRoutes');
// api
const apiRoutes = require('./routes/api');


// Use routes
app.use('/', indexRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/excursions', adminExcursionRoutes);
app.use('/booking', bookingRoutes);
app.use('/', excursionRoutes);
app.use('/api', apiRoutes);

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

app.get('/admin', (req, res) => {
     res.redirect('/admin/dashboard');
});

// After all routes - 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    metaDescription: '404 - Page Not Found - Morocco Travel Experts',
    metaKeywords: 'morocco travel, morocco tours, page not found, 404'
  });
});

// Error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', {
    title: 'Error',
    message: err.message || 'An unexpected error occurred',
    metaDescription: 'Error - Morocco Travel Experts',
    metaKeywords: 'morocco travel, morocco tours, error page'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
     console.log(`Server is running on port ${PORT}`);
});

module.exports = app;