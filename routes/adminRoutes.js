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
const CustomTourRequest = require('../models/CustomTourRequest');
const AdminController = require('../controllers/adminController');
const Blog = require('../models/Blog');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage(); // Change to memory storage for GitHub uploads

const upload = multer({
    storage: storage,
    limits: { fileSize: 100000000 }, // 100MB limit (increased from 50MB)
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
router.post('/tours/new', upload.fields([
    { name: 'images', maxCount: 20 },
    { name: 'mapImage', maxCount: 1 }
]), async (req, res) => {
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
            excludes
        } = req.body;

        let imageUrls = [];
        let mapImageUrl = '';

        // Handle regular tour images
        if (req.files.images) {
            for (const file of req.files.images) {
                const imageUrl = await uploadToGithub(file);
                imageUrls.push(imageUrl);
            }
        }

        // Handle map image
        if (req.files.mapImage && req.files.mapImage[0]) {
            mapImageUrl = await uploadToGithub(req.files.mapImage[0]);
        }

        const newTour = new Tour({
            title,
            description,
            price: parseFloat(price),
            duration: parseInt(duration),
            groupSize: parseInt(groupSize),
            startLocation,
            accommodation,
            mainImage: imageUrls[0] || '',
            images: imageUrls,
            mapImage: mapImageUrl,
            itinerary: Array.isArray(itinerary) ? itinerary : JSON.parse(itinerary),
            includes: Array.isArray(includes) ? includes : JSON.parse(includes),
            excludes: Array.isArray(excludes) ? excludes : JSON.parse(excludes)
        });

        await newTour.save();

        res.json({
            success: true,
            message: 'Tour created successfully',
            tour: newTour
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error creating tour'
        });
    }
});

// Helper function to upload to GitHub
async function uploadToGithub(file) {
    try {
        const imageBuffer = file.buffer;
        const fileName = `IMG-${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '-')}`;
        
        // For large files, use a different approach
        if (imageBuffer.length > 750000) { // ~750KB, GitHub API limit is around 1MB
            console.log(`Large file detected (${Math.round(imageBuffer.length/1024)}KB), using optimized upload method.`);
            
            // Compress the image if it's larger than 1MB
            let base64Image;
            
            // Create a unique path for each image based on date and original name
            const filePath = `tours/${new Date().toISOString().slice(0,10)}/${fileName}`;
            
            // Convert to base64
            base64Image = imageBuffer.toString('base64');
            
            const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${filePath}`, {
                method: 'PUT',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: 'Upload large image via API',
                    content: base64Image,
                    branch: 'main'
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API Error: ${errorData.message}`);
            }
            
            const data = await response.json();
            return `https://raw.githubusercontent.com/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/main/${filePath}`;
        }
        
        // Standard approach for smaller files
        const base64Image = imageBuffer.toString('base64');
        
        const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${fileName}`, {
            method: 'PUT',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Upload image via API',
                content: base64Image,
                branch: 'main'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GitHub API Error: ${errorData.message}`);
        }

        const data = await response.json();
        // Return the raw content URL instead of the API URL
        return `https://raw.githubusercontent.com/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/main/${fileName}`;
    } catch (error) {
        console.error('GitHub Upload Error:', error);
        throw new Error(`Failed to upload image to GitHub: ${error.message}`);
    }
}

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

router.post('/tours/:id/edit', upload.fields([
    { name: 'images', maxCount: 20 },
    { name: 'mapImage', maxCount: 1 }
]), async (req, res) => {
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
            existingImages // Add this to receive existing images data
        } = req.body;
        
        // Get current tour data
        const currentTour = await Tour.findById(req.params.id);
        if (!currentTour) {
            return res.status(404).json({
                success: false,
                message: 'Tour not found'
            });
        }

        // Initialize with existing images if they're being kept
        let imageUrls = existingImages ? 
            (Array.isArray(existingImages) ? existingImages : [existingImages]) : 
            (currentTour.images || []);

        let mapImageUrl = currentTour.mapImage || '';

        // Handle new tour images - append to existing images
        if (req.files.images && req.files.images.length > 0) {
            for (const file of req.files.images) {
                const imageUrl = await uploadToGithub(file);
                imageUrls.push(imageUrl);
            }
        }

        // Handle map image - only replace if a new one is uploaded
        if (req.files.mapImage && req.files.mapImage[0]) {
            mapImageUrl = await uploadToGithub(req.files.mapImage[0]);
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
            excludes: Array.isArray(excludes) ? excludes : JSON.parse(excludes)
        };

        // Update images only if we have any
        if (imageUrls.length > 0) {
            updateData.images = imageUrls;
            // Set the first image as main image if the tour doesn't have a main image
            if (!currentTour.mainImage && imageUrls.length > 0) {
                updateData.mainImage = imageUrls[0];
            }
        }

        if (mapImageUrl) {
            updateData.mapImage = mapImageUrl;
        }

        const tour = await Tour.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Tour updated successfully',
            tour: tour
        });

    } catch (error) {
        console.error(error);
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
        
        // Log the incoming data
        console.log('Starting City Form Data:', {
            city,
            description, 
            tours: Array.isArray(tours) ? tours : [tours],
            isEdit,
            existingId: req.params.id || 'none'
        });
        
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

// Custom Tour Requests Routes
router.get('/custom-requests', async (req, res) => {
    try {
        const customRequests = await CustomTourRequest.find()
            .populate('baseTour', 'title')
            .sort({ createdAt: -1 });
        
        res.render('admin/custom-requests', {
            title: 'Custom Tour Requests',
            path: '/admin/custom-requests',
            customRequests
        });
    } catch (error) {
        console.error('Error loading custom requests:', error);
        req.flash('error', 'Error loading custom tour requests');
        res.redirect('/admin/dashboard');
    }
});

router.get('/custom-requests/:id', async (req, res) => {
    try {
        const customRequest = await CustomTourRequest.findById(req.params.id)
            .populate('baseTour', 'title price duration startLocation');
        
        if (!customRequest) {
            req.flash('error', 'Custom tour request not found');
            return res.redirect('/admin/custom-requests');
        }
        
        res.render('admin/custom-request-details', {
            title: 'Custom Request Details',
            path: '/admin/custom-requests',
            customRequest
        });
    } catch (error) {
        console.error('Error loading custom request details:', error);
        req.flash('error', 'Error loading custom request details');
        res.redirect('/admin/custom-requests');
    }
});

router.post('/custom-requests/:id/update-status', async (req, res) => {
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
        console.error('Error updating custom request status:', error);
        req.flash('error', 'Error updating custom request status');
        res.redirect('/admin/custom-requests');
    }
});

// Blog Management Routes
router.get('/blogs', AdminController.getAllBlogs);
router.get('/blogs/new', AdminController.getNewBlogForm);
router.post('/blogs/new', upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'images', maxCount: 10 }
]), AdminController.createBlog);
router.get('/blogs/:id/edit', AdminController.getBlogEditForm);
router.post('/blogs/:id/edit', upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'images', maxCount: 10 }
]), AdminController.updateBlog);
router.delete('/blogs/:id', AdminController.deleteBlog);

// Helper function to upload to Cloudinary
async function uploadToCloudinary(file) {
    try {
        // Convert buffer to base64
        const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        
        // Generate a unique filename
        const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '-')}`;
        
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(base64Image, {
            public_id: `blog_images/${fileName}`,
            folder: 'morocco-travel-experts',
            resource_type: 'image'
        });
        
        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary Upload Error:', error);
        throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
    }
}

// Image upload endpoint for blog editor
router.post('/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const imageUrl = await uploadToCloudinary(req.file);
        res.json({ url: imageUrl });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

module.exports = router;
