// app.js
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const mongoose = require('mongoose');
const path = require('path');
const compression = require('compression');
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

// Routes
const adminRouter = require('./routes/adminRoutes');
const indexRouter = require('./routes/index');
const bookingRouter = require('./routes/bookingRoutes');

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
app.use('/bookings', bookingRouter);
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