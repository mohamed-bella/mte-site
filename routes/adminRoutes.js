const express = require('express');
const router = express.Router();
const Tour = require('../models/Tour');
const Booking = require('../models/Booking');
const mongoose = require('mongoose')
// const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');
const slugify = require('slugify');
const multer = require('multer');
const path = require('path');
const Setting = require('../models/Setting');
const StartingCity = require('../models/StartingCity');

const storage = multer.memoryStorage(); // Change to memory storage for GitHub uploads

const upload = multer({
    storage: storage,
    limits: { fileSize: 50000000 }, // 50MB limit
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }

});
// Check file type helper function
function checkFileType(file, cb) {
     const filetypes = /jpeg|jpg|png|gif/;
     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
     const mimetype = filetypes.test(file.mimetype);

     if (extname && mimetype) {
          return cb(null, true);
     } else {
          cb('Error: Images only!');
     }
}





// Admin Dashboard
router.get('/dashboard', async (req, res) => {
     try {
          const [tourCount, bookingCount, pendingBookings] = await Promise.all([
               Tour.countDocuments(),
               Booking.countDocuments(),
               Booking.countDocuments({ status: 'pending' })
          ]);

          res.render('admin/dashboard', {
               path: "/admin/dashboard",
               title: 'Admin Dashboard',
               stats: {
                    tourCount,
                    bookingCount,
                    pendingBookings
               }
          });
     } catch (error) {
          console.log(error)
          req.flash('error', 'Error loading dashboard');
          res.redirect('/');
     }
});

// Tours Management Routes
router.get('/tours', async (req, res) => {
     try {
          const tours = await Tour.find().sort({ createdAt: -1 });
          res.render('admin/tours', {
               title: 'Manage Tours',
               tours
          });
     } catch (error) {
          req.flash('error', 'Error loading tours');
          res.redirect('/admin/dashboard');
     }
});

router.get('/tours/new', (req, res) => {
     res.render('admin/tour-form', {
          title: 'Add New Tour',
          tour: null
     });
});
router.post('/tours/new', upload.array('images', 10), async (req, res) => {
     console.log(req.body)
     try {
          const {
               title,
               description,
               price,
               duration,
               groupSize,
               startLocation,
               accommodation,
               itinerary,
               includes,
               excludes,
               mapCoordinates
          } = req.body;

          // Upload images to GitHub if files exist
          let imageUrls = [];
          if (req.files && req.files.length > 0) {
               const githubToken = process.env.GITHUB_TOKEN;
               const repoOwner = process.env.GITHUB_OWNER;
               const repoName = process.env.GITHUB_REPO;

               // Upload each image
               for (const file of req.files) {
                    const imageBuffer = file.buffer;
                    const fileName = `tours/${Date.now()}-${file.originalname}`;
                    const base64Image = imageBuffer.toString('base64');

                    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${fileName}`, {
                         method: 'PUT',
                         headers: {
                              'Authorization': `token ${githubToken}`,
                              'Content-Type': 'application/json',
                         },
                         body: JSON.stringify({
                              message: 'Upload tour image',
                              content: base64Image
                         })
                    });

                    if (response.ok) {
                         const data = await response.json();
                         imageUrls.push(data.content.download_url);
                    } else {
                         throw new Error('Failed to upload image to GitHub');
                    }
               }
          }

          const newTour = new Tour({
               title,
               description,
               price: parseFloat(price),
               duration: parseInt(duration),
               groupSize: parseInt(groupSize),
               startLocation,
               accommodation,
               mainImage: imageUrls[0] || '', // First image becomes main image
               images: imageUrls, // Store all image URLs
               itinerary: Array.isArray(itinerary) ? itinerary : JSON.parse(itinerary),
               includes: Array.isArray(includes) ? includes : JSON.parse(includes),
               excludes: Array.isArray(excludes) ? excludes : JSON.parse(excludes),
               mapCoordinates: Array.isArray(mapCoordinates) ? mapCoordinates : JSON.parse(mapCoordinates)
          });

          await newTour.save();

          res.json({
               success: true,
               message: 'Tour created successfully',
               tour: newTour
          });

     } catch (error) {
          console.log(error)
          res.status(500).json({
               success: false,
               message: error.message || 'Error creating tour'
          });
     }
});

router.get('/tours/:id/edit', async (req, res) => {
     try {
          const tour = await Tour.findById(req.params.id);
          if (!tour) {
               req.flash('error', 'Tour not found');
               return res.redirect('/admin/tours');
          }
          res.render('admin/tour-form', {
               title: 'Edit Tour',
               tour,
               path: '/admin/tours' // Add path for sidebar highlighting
          });
     } catch (error) {
          console.error('Error loading tour:', error);
          req.flash('error', 'Error loading tour');
          res.redirect('/admin/tours');
     }
});
router.post('/tours/:id/edit', upload.array('images', 10), async (req, res) => {
     
     try {
          const {
               title,
               description,
               price,
               duration,
               groupSize,
               startLocation,
               accommodation,
               itinerary,
               includes,
               excludes,
               mapCoordinates
          } = req.body;

          let imageUrls = [];
          if (req.files && req.files.length > 0) {
               for (const file of req.files) {
                    const imageBuffer = file.buffer;
                    const fileName = `tours/${Date.now()}-${file.originalname}`;

                    // GitHub API configuration  
                    const githubToken = process.env.GITHUB_TOKEN;
                    const repoOwner = process.env.GITHUB_OWNER;
                    const repoName = process.env.GITHUB_REPO;

                    // Convert image to base64
                    const base64Image = imageBuffer.toString('base64');

                    // Upload to GitHub
                    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${fileName}`, {
                         method: 'PUT',
                         headers: {
                              'Authorization': `token ${githubToken}`,
                              'Content-Type': 'application/json',
                         },
                         body: JSON.stringify({
                              message: 'Update tour image',
                              content: base64Image
                         })
                    });

                    if (response.ok) {
                         const data = await response.json();
                         imageUrls.push(data.content.download_url);
                    } else {
                         throw new Error('Failed to upload image to GitHub');
                    }
               }
          }

          const updateData = {
               title,
               description,
               price: parseFloat(price),
               duration: parseInt(duration),
               groupSize: parseInt(groupSize),
               startLocation,
               accommodation,
               itinerary: Array.isArray(itinerary) ? itinerary : JSON.parse(itinerary),
               includes: Array.isArray(includes) ? includes : JSON.parse(includes),
               excludes: Array.isArray(excludes) ? excludes : JSON.parse(excludes),
               mapCoordinates: Array.isArray(mapCoordinates) ? mapCoordinates : JSON.parse(mapCoordinates),
               slug: slugify(title, { lower: true })
          };

          if (imageUrls.length > 0) {
               updateData.mainImage = imageUrls[0];
               updateData.images = imageUrls;
          }

          const tour = await Tour.findByIdAndUpdate(
               req.params.id,
               updateData,
               { new: true, runValidators: true }
          );

          if (!tour) {
               return res.status(404).json({
                    success: false,
                    message: 'Tour not found'
               });
          }

          res.json({
               success: true,
               message: 'Tour updated successfully',
               tour: tour
          });

     } catch (error) {
          console.log(error);
          res.status(500).json({
               success: false,
               message: error.message || 'Error updating tour'
          });
     }
});

router.post('/tours/:id/delete', async (req, res) => {
     try {
          const tour = await Tour.findByIdAndDelete(req.params.id);
          if (!tour) {
               req.flash('error', 'Tour not found');
          } else {
               req.flash('success', 'Tour deleted successfully');
          }
     } catch (error) {
          req.flash('error', 'Error deleting tour');
     }
     res.redirect('/admin/tours');
});
router.post('/tours/:id/toggle-featured', async (req, res) => {
     try {
          const tour = await Tour.findById(req.params.id);
          
          if (!tour) {
               req.flash('error', 'Tour not found');
               return res.redirect('/admin/tours');
          }

          // Toggle the featured status
          tour.featured = !tour.featured;
          await tour.save();

          req.flash('success', `Tour ${tour.featured ? 'featured' : 'unfeatured'} successfully`);
          res.redirect("/admin/tours");

     } catch (error) {
          req.flash('error', 'Error toggling tour featured status');
          res.redirect('/admin/tours');
     }
});

// Bookings Management Routes
router.get('/bookings', async (req, res) => {
     try {
          const bookings = await Booking.find()
               .populate('tour', 'title')
               .sort({ createdAt: -1 });

          res.render('admin/bookings', {
               title: 'Manage Bookings',
               bookings
          });
     } catch (error) {
          req.flash('error', 'Error loading bookings');
          res.redirect('/admin/dashboard');
     }
});

router.get('/bookings/:id', async (req, res) => {
     try {
          const booking = await Booking.findById(req.params.id)
               .populate('tour');

          if (!booking) {
               req.flash('error', 'Booking not found');
               return res.redirect('/admin/bookings');
          }

          res.render('admin/booking-details', {
               title: 'Booking Details',
               booking
          });
     } catch (error) {
          req.flash('error', 'Error loading booking details');
          res.redirect('/admin/bookings');
     }
});

router.post('/bookings/:id/status', async (req, res) => {
     try {
          const { status } = req.body;
          const booking = await Booking.findByIdAndUpdate(
               req.params.id,
               { status },
               { new: true }
          );

          if (!booking) {
               req.flash('error', 'Booking not found');
          } else {
               req.flash('success', 'Booking status updated successfully');

               // Send email notification based on status change
               if (status === 'confirmed') {
                    // TODO: Send confirmation email to customer
               } else if (status === 'cancelled') {
                    // TODO: Send cancellation email to customer
               }
          }
     } catch (error) {
          req.flash('error', 'Error updating booking status');
     }
     res.redirect('/admin/bookings');
});

router.post('/bookings/:id/delete', async (req, res) => {
     try {
          const booking = await Booking.findByIdAndDelete(req.params.id);
          if (!booking) {
               req.flash('error', 'Booking not found');
          } else {
               req.flash('success', 'Booking deleted successfully');
          }
     } catch (error) {
          req.flash('error', 'Error deleting booking');
     }
     res.redirect('/admin/bookings');
});

// Analytics Routes
// router.get('/analytics', async (req, res) => {
//      try {
//           // Get monthly booking statistics
//           const monthlyBookings = await Booking.aggregate([
//                {
//                     $group: {
//                          _id: {
//                               month: { $month: "$createdAt" },
//                               year: { $year: "$createdAt" }
//                          },
//                          count: { $sum: 1 },
//                          revenue: { $sum: "$totalPrice" }
//                     }
//                },
//                { $sort: { "_id.year": -1, "_id.month": -1 } }
//           ]);

//           // Get popular tours
//           const popularTours = await Booking.aggregate([
//                {
//                     $group: {
//                          _id: "$tour",
//                          bookings: { $sum: 1 }
//                     }
//                },
//                { $sort: { bookings: -1 } },
//                { $limit: 5 }
//           ]).exec();

//           // Populate tour details
//           await Tour.populate(popularTours, { path: '_id', select: 'title' });

//           res.render('admin/analytics', {
//                title: 'Analytics',
//                monthlyBookings,
//                popularTours
//           });
//      } catch (error) {
//           req.flash('error', 'Error loading analytics');
//           res.redirect('/admin/dashboard');
//      }
// });
router.get('/analytics', async (req, res) => {
     try {
          const days = parseInt(req.query.days) || 30;
          const dateFrom = new Date();
          dateFrom.setDate(dateFrom.getDate() - days);

          // Get basic stats
          const [totalBookings, totalRevenue, popularTours, monthlyData] = await Promise.all([
               // Total bookings
               Booking.countDocuments({ createdAt: { $gte: dateFrom } }),

               // Total revenue
               Booking.aggregate([
                    { $match: { createdAt: { $gte: dateFrom } } },
                    { $group: { _id: null, total: { $sum: '$totalPrice' } } }
               ]),

               // Popular tours
               Booking.aggregate([
                    { $match: { createdAt: { $gte: dateFrom } } },
                    {
                         $group: {
                              _id: '$tour',
                              bookings: { $sum: 1 },
                              revenue: { $sum: '$totalPrice' }
                         }
                    },
                    { $sort: { bookings: -1 } },
                    { $limit: 5 },
                    {
                         $lookup: {
                              from: 'tours',
                              localField: '_id',
                              foreignField: '_id',
                              as: 'tourDetails'
                         }
                    },
                    { $unwind: '$tourDetails' },
                    {
                         $project: {
                              '_id.title': '$tourDetails.title',
                              bookings: 1,
                              revenue: 1
                         }
                    }
               ]),

               // Monthly data
               Booking.aggregate([
                    { $match: { createdAt: { $gte: dateFrom } } },
                    {
                         $group: {
                              _id: {
                                   year: { $year: '$createdAt' },
                                   month: { $month: '$createdAt' },
                                   day: { $dayOfMonth: '$createdAt' }
                              },
                              bookings: { $sum: 1 },
                              revenue: { $sum: '$totalPrice' }
                         }
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
               ])
          ]);

          // Calculate growth rates
          const previousPeriod = new Date();
          previousPeriod.setDate(previousPeriod.getDate() - (days * 2));

          const [previousBookings, previousRevenue] = await Promise.all([
               Booking.countDocuments({
                    createdAt: {
                         $gte: previousPeriod,
                         $lt: dateFrom
                    }
               }),
               Booking.aggregate([
                    {
                         $match: {
                              createdAt: {
                                   $gte: previousPeriod,
                                   $lt: dateFrom
                              }
                         }
                    },
                    {
                         $group: {
                              _id: null,
                              total: { $sum: '$totalPrice' }
                         }
                    }
               ])
          ]);

          // Calculate growth percentages
          const bookingGrowth = previousBookings === 0 ? 100 :
               (((totalBookings - previousBookings) / previousBookings) * 100).toFixed(1);

          const revenueGrowth = previousRevenue.length === 0 ? 100 :
               (((totalRevenue[0].total - previousRevenue[0].total) / previousRevenue[0].total) * 100).toFixed(1);

          // Format data for charts
          const formattedMonthlyData = monthlyData.map(item => ({
               date: `${item._id.year}-${item._id.month}-${item._id.day}`,
               bookings: item.bookings,
               revenue: item.revenue
          }));

          // Get recent activity
          const recentActivity = await Booking.find()
               .sort({ createdAt: -1 })
               .limit(10)
               .populate('tour', 'title')
               .lean();

          const formattedActivity = recentActivity.map(booking => ({
               type: booking.status === 'cancelled' ? 'cancellation' : 'booking',
               description: `${booking.firstName} ${booking.lastName} ${booking.status === 'cancelled' ? 'cancelled' : 'booked'
                    } ${booking.tour.title}`,
               time: booking.createdAt.toLocaleDateString()
          }));

          res.render('admin/analytics', {
               title: 'Analytics',
               stats: {
                    totalBookings,
                    totalRevenue: totalRevenue[0]?.total || 0,
                    avgBookingValue: totalBookings === 0 ? 0 : Math.round((totalRevenue[0]?.total || 0) / totalBookings),
                    conversionRate: 0, // This would need additional data to calculate
                    bookingGrowth,
                    revenueGrowth
               },
               monthlyRevenue: formattedMonthlyData,
               monthlyBookings: formattedMonthlyData,
               popularTours,
               recentActivity: formattedActivity
          });
     } catch (error) {
          console.error('Analytics error:', error);
          req.flash('error', 'Error loading analytics');
          res.redirect('/admin/dashboard');
     }
});

// API endpoint for updating analytics data
router.get('/analytics/data', async (req, res) => {
     try {
          const days = parseInt(req.query.days) || 30;
          // ... Same aggregation logic as above ...
          res.json({
               success: true,
               stats: {
                    // ... stats data ...
               },
               monthlyRevenue: formattedMonthlyData,
               monthlyBookings: formattedMonthlyData,
               popularTours,
               recentActivity: formattedActivity
          });
     } catch (error) {
          console.error('Analytics data error:', error);
          res.status(500).json({
               success: false,
               error: 'Error fetching analytics data'
          });
     }
});


// Settings Routes
router.get('/settings', async (req, res) => {
     try {
          const settings = await Setting.findOne();
          res.render('admin/settings', {
               title: 'Settings',
               settings
          });
     } catch (error) {
          req.flash('error', 'Error loading settings');
          res.redirect('/admin/dashboard');
     }
});

router.post('/settings', async (req, res) => {
     try {
          const { 
               siteTitle, 
               contactEmail, 
               phoneNumber, 
               facebook, 
               instagram, 
               twitter,
               address,
               coordinates
          } = req.body;

          const setting = await Setting.findOneAndUpdate(
               {},
               { 
                    siteTitle, 
                    contactEmail, 
                    phoneNumber, 
                    socialMedia: { facebook, instagram, twitter },
                    address,
                    coordinates: {
                         lat: parseFloat(coordinates.lat),
                         lng: parseFloat(coordinates.lng)
                    }
               },
               { new: true, upsert: true }
          );

          req.flash('success', 'Settings updated successfully');
          res.redirect('/admin/settings');
     } catch (error) {
          console.error('Settings update error:', error);
          req.flash('error', 'Error updating settings');
          res.redirect('/admin/settings');
     }
});

// Starting Cities Management Routes
router.get('/starting-cities', async (req, res) => {
    try {
        const cities = await StartingCity.find().populate('tours', 'title');
        res.render('admin/starting-cities', {
            title: 'Manage Starting Cities',
            cities
        });
    } catch (error) {
        req.flash('error', 'Error loading starting cities');
        res.redirect('/admin/dashboard');
    }
});

router.get('/starting-cities/new', async (req, res) => {
    try {
        const tours = await Tour.find().select('title startLocation');
        res.render('admin/starting-city-form', {
            title: 'Add New Starting City',
            tours,
            city: null
        });
    } catch (error) {
        req.flash('error', 'Error loading form');
        res.redirect('/admin/starting-cities');
    }
});

// Create/Edit Starting City
router.post('/starting-cities/:id?', upload.single('image'), async (req, res) => {
    try {
        const { city, description, tours } = req.body;
        const isEdit = !!req.params.id;
        
        // Only require image for new cities
        if (!req.file && !isEdit) {
            req.flash('error', 'Please upload an image');
            return res.redirect(isEdit ? `/admin/starting-cities/${req.params.id}/edit` : '/admin/starting-cities/new');
        }

        let imageUrl;
        if (req.file) {
            // Upload image to GitHub
            const imageBuffer = req.file.buffer;
            const fileName = `starting-cities/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '-')}`;
            const content = imageBuffer.toString('base64');

            // Make direct API call to GitHub
            const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${fileName}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `${isEdit ? 'Update' : 'Upload'} starting city image`,
                    content: content,
                    branch: process.env.GITHUB_BRANCH || 'main'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to upload image to GitHub');
            }

            imageUrl = `https://raw.githubusercontent.com/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/${process.env.GITHUB_BRANCH || 'main'}/${fileName}`;
        }

        const cityData = {
            city,
            description,
            tours: Array.isArray(tours) ? tours : [tours]
        };

        if (imageUrl) {
            cityData.image = imageUrl;
        }

        if (isEdit) {
            await StartingCity.findByIdAndUpdate(req.params.id, cityData);
            req.flash('success', 'Starting city updated successfully');
        } else {
            const newCity = new StartingCity(cityData);
            await newCity.save();
            req.flash('success', 'Starting city created successfully');
        }

        res.redirect('/admin/starting-cities');
    } catch (error) {
        console.error(`Error ${isEdit ? 'updating' : 'creating'} starting city:`, error);
        req.flash('error', error.message || `Error ${isEdit ? 'updating' : 'creating'} starting city`);
        res.redirect(isEdit ? `/admin/starting-cities/${req.params.id}/edit` : '/admin/starting-cities/new');
    }
});

// Get edit form
router.get('/starting-cities/:id/edit', async (req, res) => {
    try {
        const city = await StartingCity.findById(req.params.id);
        const tours = await Tour.find().select('title startLocation');
        res.render('admin/starting-city-form', {
            title: 'Edit Starting City',
            city,
            tours
        });
    } catch (error) {
        req.flash('error', 'Error loading form'); 
        res.redirect('/admin/starting-cities');   
    }
});


module.exports = router;
