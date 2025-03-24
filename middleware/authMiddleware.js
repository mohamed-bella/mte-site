const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication middleware
 * Verifies if user is logged in by checking JWT token
 */
exports.isLoggedIn = async (req, res, next) => {
  try {
    // Check if there's a token in cookies
    if (!req.cookies.jwt) {
      return res.redirect('/admin/login');
    }

    // Verify token
    const decoded = jwt.verify(req.cookies.jwt, process.env.JWT_SECRET || 'your-fallback-secret');
    
    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.redirect('/admin/login');
    }

    // Grant access to protected route
    req.user = user;
    next();
  } catch (err) {
    console.error('Authentication error:', err.message);
    res.redirect('/admin/login');
  }
};

/**
 * Authorization middleware
 * Checks if admin is authenticated with the correct admin password via cookie
 */
exports.isAdmin = (req, res, next) => {
  // Check for adminAuth cookie instead of user object
  const adminPassword = req.cookies.adminAuth;
  
  if (adminPassword && adminPassword === process.env.ADMIN_PASSWORD) {
    next();
  } else {
    res.status(403).render('error', {
      title: 'Access Denied',
      message: 'You do not have permission to access this page.'
    });
  }
};

/**
 * Check user middleware
 * Makes user data available to templates if logged in
 */
exports.checkUser = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const decoded = jwt.verify(req.cookies.jwt, process.env.JWT_SECRET || 'your-fallback-secret');
      const user = await User.findById(decoded.id);
      
      if (user) {
        res.locals.user = user;
      } else {
        res.locals.user = null;
      }
    } catch (err) {
      console.error('Check user error:', err.message);
      res.locals.user = null;
    }
  } else {
    res.locals.user = null;
  }
  next();
}; 