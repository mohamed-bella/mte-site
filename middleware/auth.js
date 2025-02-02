// // middleware/auth.js
// exports.isAuthenticated = (req, res, next) => {
//      // Check session or cookie
//      if (req.session.isAuthenticated || req.cookies.adminToken === 'authenticated') {
//           return next();
//      }

//      req.flash('error', 'Please log in to access this page');
//      res.redirect('/auth/login');
// };