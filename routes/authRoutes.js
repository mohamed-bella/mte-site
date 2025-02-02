// // routes/authRoutes.js
// const express = require('express');
// const router = express.Router();
// const bcrypt = require('bcryptjs');

// // Login page render
// router.get('/login', (req, res) => {
//      // Redirect if already authenticated
//      if (req.session.isAuthenticated) {
//           return res.redirect('/admin/dashboard');
//      }
//      res.render('auth/login', {
//           title: 'Admin Login',
//           error: req.flash('error')
//      });
// });

// // Login handler
// router.post('/login', async (req, res) => {
//      try {
//           console.log('Login attempt - Request body:', req.body);
//           const { password, rememberMe } = req.body;

//           if (!process.env.ADMIN_PASSWORD) {
//                console.error('ADMIN_PASSWORD environment variable is not set');
//                req.flash('error', 'Server configuration error');
//                return res.redirect('/auth/login');
//           }

//           console.log('Comparing passwords...');
//           console.log(password, process.env.ADMIN_PASSWORD)
//           // Compare with environment variable password
//           // const isMatch = await bcrypt.compare(password, process.env.ADMIN_PASSWORD);
//           // console.log('Password match result:', isMatch);

//           if (password !== process.env.ADMIN_PASSWORD) {
//                console.log('Invalid password attempt');
//                req.flash('error', 'Invalid password');
//                return res.redirect('/auth/login');
//           }

//           console.log('Password validated, setting session...');
//           // Set session
//           req.session.isAuthenticated = true;
//           console.log('Session set:', req.session);

//           // Set remember me cookie if checked
//           if (rememberMe) {
//                console.log('Setting remember me cookie...');
//                const thirtyDays = 30 * 24 * 60 * 60 * 1000;
//                res.cookie('adminToken', 'authenticated', {
//                     httpOnly: true,
//                     secure: process.env.NODE_ENV === 'production',
//                     expires: new Date(Date.now() + thirtyDays)
//                });
//                console.log('Remember me cookie set');
//           }

//           console.log('Login successful, redirecting to dashboard...');
//           req.flash('success', 'Logged in successfully');
//           res.render('admin/dashboard');
//      } catch (error) {
//           console.error('Login error:', error);
//           console.error('Error stack:', error.stack);
//           req.flash('error', 'An error occurred during login');
//           res.redirect('/auth/login');
//      }
// });

// // Logout handler
// router.get('/logout', (req, res) => {
//      // Clear session
//      req.session.destroy((err) => {
//           if (err) {
//                console.error('Session destruction error:', err);
//           }

//           // Clear remember me cookie
//           res.clearCookie('adminToken');

//           // Redirect to login
//           res.redirect('/auth/login');
//      });
// });

// module.exports = router;