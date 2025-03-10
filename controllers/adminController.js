// // controllers/adminController.js
// const Tour = require('../models/Tour');
// const Booking = require('../models/Booking');
const CustomTourRequest = require('../models/CustomTourRequest');
// const slugify = require('slugify');

// Tour Management
exports.getDashboard = async (req, res) => {
     try {
          const [tourCount, bookingCount, pendingBookings, customRequestsCount] = await Promise.all([
               Tour.countDocuments() || 0,
               Booking.countDocuments() || 0,
               Booking.countDocuments({ status: 'pending' }) || 0,
               CustomTourRequest.countDocuments() || 0
          ]);

          res.render('admin/dashboard', {
               title: 'Admin Dashboard',
               path: '/admin/dashboard',
               stats: {
                    tourCount,
                    bookingCount,
                    pendingBookings,
                    customRequestsCount
               }
          });
     } catch (error) {
          req.flash('error', 'Error loading dashboard');
          res.redirect('/admin');
     }
};

// exports.getAllTours = async (req, res) => {
//      try {
//           const tours = await Tour.find().sort('-createdAt');
//           res.render('admin/tours', {
//                title: 'Manage Tours',
//                tours
//           });
//      } catch (error) {
//           req.flash('error', 'Error loading tours');
//           res.redirect('/admin/dashboard');
//      }
// };

// exports.getCreateTourForm = (req, res) => {
//      res.render('admin/new-tour', {
//           title: 'Create New Tour'
//      });
// };

// exports.getTourById = async (req, res) => {
//      try {
//           const tour = await Tour.findById(req.params.id);
//           if (!tour) {
//                req.flash('error', 'Tour not found');
//                return res.redirect('/admin/tours');
//           }
//           res.render('admin/edit-tour', {
//                title: 'Edit Tour',
//                tour
//           });
//      } catch (error) {
//           req.flash('error', 'Error loading tour');
//           res.redirect('/admin/tours');
//      }
// };

// exports.createTour = async (req, res) => {
//      try {
//           // Extract tour data from request body
//           const {
//                title,
//                description,
//                price,
//                duration,
//                groupSize,
//                startLocation,
//                accommodation,
//                mainImage,
//                images,
//                itinerary
//           } = req.body;

//           // Create tour object
//           const tourData = {
//                title,
//                description,
//                price,
//                duration,
//                groupSize,
//                startLocation,
//                accommodation,
//                mainImage,
//                images: Array.isArray(images) ? images.filter(url => url.trim() !== '') : [],
//                slug: slugify(title, { lower: true }),
//                itinerary: Array.isArray(itinerary) ? itinerary : JSON.parse(itinerary)
//           };

//           // Create new tour
//           const newTour = await Tour.create(tourData);

//           req.flash('success', 'Tour created successfully');
//           res.redirect(`/admin/tours/${newTour._id}`);
//      } catch (error) {
//           console.error('Tour creation error:', error);
//           req.flash('error', error.message || 'Error creating tour');
//           res.redirect('/admin/tours/new');
//      }
// };

// exports.updateTour = async (req, res) => {
//      try {
//           const tourId = req.params.id;
//           const {
//                title,
//                description,
//                price,
//                duration,
//                groupSize,
//                startLocation,
//                accommodation,
//                mainImage,
//                images,
//                itinerary
//           } = req.body;

//           // Prepare update data
//           const updateData = {
//                title,
//                description,
//                price,
//                duration,
//                groupSize,
//                startLocation,
//                accommodation,
//                mainImage,
//                images: Array.isArray(images) ? images.filter(url => url.trim() !== '') : [],
//                slug: slugify(title, { lower: true }),
//                itinerary: Array.isArray(itinerary) ? itinerary : JSON.parse(itinerary),
//                updatedAt: Date.now()
//           };

//           // Update tour
//           const updatedTour = await Tour.findByIdAndUpdate(tourId, updateData, {
//                new: true,
//                runValidators: true
//           });

//           if (!updatedTour) {
//                req.flash('error', 'Tour not found');
//                return res.redirect('/admin/tours');
//           }

//           req.flash('success', 'Tour updated successfully');
//           res.redirect(`/admin/tours/${tourId}`);
//      } catch (error) {
//           console.error('Tour update error:', error);
//           req.flash('error', error.message || 'Error updating tour');
//           res.redirect(`/admin/tours/${req.params.id}/edit`);
//      }
// };

// exports.deleteTour = async (req, res) => {
//      try {
//           const tour = await Tour.findByIdAndDelete(req.params.id);

//           if (!tour) {
//                req.flash('error', 'Tour not found');
//                return res.redirect('/admin/tours');
//           }

//           req.flash('success', 'Tour deleted successfully');
//           res.redirect('/admin/tours');
//      } catch (error) {
//           req.flash('error', 'Error deleting tour');
//           res.redirect('/admin/tours');
//      }
// };

// exports.toggleTourFeatured = async (req, res) => {
//      try {
//           const tour = await Tour.findById(req.params.id);
//           if (!tour) {
//                req.flash('error', 'Tour not found');
//                return res.redirect('/admin/tours');
//           }

//           tour.isFeatured = !tour.isFeatured;
//           await tour.save();

//           req.flash('success', 'Tour featured status updated successfully');
//           res.redirect('/admin/tours');
//      } catch (error) {
//           req.flash('error', 'Error toggling featured status');
//           res.redirect('/admin/tours');
//      }
// };

// // Booking Management
// exports.getAllBookings = async (req, res) => {
//      try {
//           const bookings = await Booking.find()
//                .populate('tour', 'title price')
//                .sort('-createdAt');

//           res.render('admin/bookings', {
//                title: 'Manage Bookings',
//                bookings
//           });
//      } catch (error) {
//           req.flash('error', 'Error loading bookings');
//           res.redirect('/admin/dashboard');
//      }
// };

// exports.getBookingDetails = async (req, res) => {
//      try {
//           const booking = await Booking.findById(req.params.id)
//                .populate('tour', 'title price duration startLocation');

//           if (!booking) {
//                req.flash('error', 'Booking not found');
//                return res.redirect('/admin/bookings');
//           }

//           res.render('admin/booking-details', {
//                title: 'Booking Details',
//                booking
//           });
//      } catch (error) {
//           req.flash('error', 'Error loading booking details');
//           res.redirect('/admin/bookings');
//      }
// };

// exports.updateBookingStatus = async (req, res) => {
//      try {
//           const { status } = req.body;
//           const booking = await Booking.findByIdAndUpdate(
//                req.params.id,
//                { status },
//                { new: true }
//           );

//           if (!booking) {
//                req.flash('error', 'Booking not found');
//                return res.redirect('/admin/bookings');
//           }

//           req.flash('success', 'Booking status updated successfully');
//           res.redirect('/admin/bookings');
//      } catch (error) {
//           req.flash('error', 'Error updating booking status');
//           res.redirect('/admin/bookings');
//      }
// };

// exports.deleteBooking = async (req, res) => {
//      try {
//           const booking = await Booking.findByIdAndDelete(req.params.id);

//           if (!booking) {
//                req.flash('error', 'Booking not found');
//                return res.redirect('/admin/bookings');
//           }

//           req.flash('success', 'Booking deleted successfully');
//           res.redirect('/admin/bookings');
//      } catch (error) {
//           req.flash('error', 'Error deleting booking');
//           res.redirect('/admin/bookings');
//      }
// };

// // Export settings if needed
// exports.getSettings = (req, res) => {
//      res.render('admin/settings', {
//           title: 'Admin Settings'
//      });
// };

// Custom Tour Requests Management
exports.getAllCustomRequests = async (req, res) => {
     try {
          const customRequests = await CustomTourRequest.find()
               .populate('baseTour', 'title')
               .sort('-createdAt');

          res.render('admin/custom-requests', {
               title: 'Custom Tour Requests',
               customRequests
          });
     } catch (error) {
          req.flash('error', 'Error loading custom tour requests');
          res.redirect('/admin/dashboard');
     }
};

exports.getCustomRequestDetails = async (req, res) => {
     try {
          const customRequest = await CustomTourRequest.findById(req.params.id)
               .populate('baseTour', 'title price duration startLocation');

          if (!customRequest) {
               req.flash('error', 'Custom tour request not found');
               return res.redirect('/admin/custom-requests');
          }

          res.render('admin/custom-request-details', {
               title: 'Custom Request Details',
               customRequest
          });
     } catch (error) {
          req.flash('error', 'Error loading custom request details');
          res.redirect('/admin/custom-requests');
     }
};

exports.updateCustomRequestStatus = async (req, res) => {
     try {
          const { status } = req.body;
          const customRequest = await CustomTourRequest.findByIdAndUpdate(
               req.params.id,
               { 
                    status,
                    updatedAt: Date.now() 
               },
               { new: true }
          );

          if (!customRequest) {
               req.flash('error', 'Custom tour request not found');
               return res.redirect('/admin/custom-requests');
          }

          req.flash('success', 'Custom tour request status updated successfully');
          res.redirect('/admin/custom-requests');
     } catch (error) {
          req.flash('error', 'Error updating custom request status');
          res.redirect('/admin/custom-requests');
     }
};

// module.exports = exports;