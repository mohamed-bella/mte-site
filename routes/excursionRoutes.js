const express = require('express');
const router = express.Router();
const excursionController = require('../controllers/excursionController');
const { isAdmin } = require('../middleware/authMiddleware');

// Admin routes
router.get('/admin/excursions', isAdmin, excursionController.getAllExcursionsAdmin);
router.get('/admin/excursions/add', isAdmin, excursionController.getAddExcursionForm);
router.post('/admin/excursions/add', isAdmin, excursionController.createExcursion);
router.get('/admin/excursions/edit/:id', isAdmin, excursionController.getEditExcursionForm);
router.post('/admin/excursions/edit/:id', isAdmin, excursionController.updateExcursion);
router.post('/admin/excursions/delete/:id', isAdmin, excursionController.deleteExcursion);
router.post('/admin/excursions/toggle-featured/:id', isAdmin, excursionController.toggleFeatured);

// Admin reservation routes
router.get('/admin/excursion-reservations', isAdmin, excursionController.getAllReservationsAdmin);
router.post('/admin/excursion-reservations/:id/status', isAdmin, excursionController.updateReservationStatus);

// Public routes
router.get('/excursions', excursionController.getAllExcursions);
router.get('/excursions/:slug', excursionController.getExcursionBySlug);
router.post('/excursions/:slug/book', excursionController.bookExcursion);

// Reservation/inquiry routes - accessible to all users
router.post('/excursions/reserve', excursionController.createReservation);
router.post('/excursions/inquiry', excursionController.submitInquiry);

// Export the router
module.exports = router; 