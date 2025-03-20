// routes/index.js
const express = require('express');
const router = express.Router();
const Tour = require('../models/Tour');
const Booking = require('../models/Booking');
const Setting = require('../models/Setting');
const mongoose = require('mongoose');
const pdf = require('html-pdf');
const ejs = require('ejs');
const path = require('path');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const StartingCity = require('../models/StartingCity');
const { scrapeGoogleReviews } = require('../utils/reviewScraper');
const Blog = require('../models/Blog');
const homeController = require('../controllers/homeController');
const { csrfProtection } = require('../middleware/security');

dotenv.config();

// Middleware to load global settings
const loadSettings = async (req, res, next) => {
     try {
          const settings = await Setting.findOne();
        res.locals.settings = settings || {};
          next();
     } catch (error) {
          console.error('Error loading settings:', error);
        res.locals.settings = {};
          next();
     }
};

// Apply settings middleware to all routes
router.use(loadSettings);

// Main routes
router.get('/', homeController.getHomePage);
router.get('/about', homeController.getAboutPage);
router.get('/contact', homeController.getContactPage);
router.post('/contact', homeController.submitContactForm);

// Blog routes
router.get('/blog', async (req, res) => {
    try {
        // Get query parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;
        const category = req.query.category;
        const tag = req.query.tag;
        const search = req.query.search;
        
        // Build query
        let query = { isPublished: true };
        
        if (category) {
            query.category = category;
        }
        
        if (tag) {
            query.tags = tag;
        }
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { summary: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Execute query with pagination
        const skip = (page - 1) * limit;
        
        const [blogs, totalCount, categoryStats, tagStats] = await Promise.all([
            Blog.find(query)
                .sort({ publishedAt: -1 })
                .skip(skip)
                .limit(limit),
            Blog.countDocuments(query),
            Blog.aggregate([
                { $match: { isPublished: true } },
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            Blog.aggregate([
                { $match: { isPublished: true } },
                { $unwind: '$tags' },
                { $group: { _id: '$tags', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ])
        ]);
        
        // Get recent posts for sidebar
        const recentPosts = await Blog.find({ isPublished: true })
            .sort({ publishedAt: -1 })
            .limit(3)
            .select('title slug featuredImage publishedAt');
            
        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        
        res.render('pages/blog', {
            title: 'Blog | Morocco Travel Experts',
            metaDescription: 'Explore our blog for travel tips, destination guides, and insights about Morocco tours and adventures.',
            currentUrl: '/blog',
            blogs,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages,
                hasNextPage,
                hasPrevPage
            },
            filter: {
                category,
                tag,
                search
            },
            categoryStats,
            tagStats,
            recentPosts
          });
     } catch (error) {
        console.error('Error fetching blog posts:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load blog posts',
            error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
          });
     }
});

router.get('/blog/:slug', async (req, res, next) => {
    try {
        const blog = await Blog.findOne({ slug: req.params.slug, isPublished: true });
        
        if (!blog) {
            return res.status(404).render('error', {
                title: 'Not Found',
                message: 'The blog post you are looking for does not exist or has been removed.',
                error: { status: 404 }
            });
        }
        
        // Get related posts based on categories and tags
        const relatedPosts = await Blog.find({
            _id: { $ne: blog._id },
            isPublished: true,
            $or: [
                { category: blog.category },
                { tags: { $in: Array.isArray(blog.tags) ? blog.tags : [] } }
            ]
        })
        .sort({ publishedAt: -1 })
        .limit(3);
        
        // Update view count or other analytics here if needed
        
        res.render('pages/blog-single', {
            title: blog.metaTitle || `${blog.title} | Morocco Travel Blog`,
            metaDescription: blog.metaDescription || blog.summary,
            metaKeywords: blog.metaKeywords,
            currentUrl: `/blog/${blog.slug}`,
            blog,
            relatedPosts
        });
    } catch (error) {
        console.error('Error fetching blog post:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load blog post',
            error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
        });
    }
});

// Tour routes
router.get('/tours', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 9; // Number of tours per page
        const skip = (page - 1) * limit;
        
        // Parse filter parameters
        const city = req.query.city;
        const duration = req.query.duration;
        const minPrice = req.query.minPrice ? parseInt(req.query.minPrice) : 0;
        const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice) : 100000;
        
        // Build query object
        const query = {};
        
        if (city) {
            query.startLocation = { $regex: city, $options: 'i' };
        }
        
        if (duration) {
            query.duration = duration;
        }
        
        query.price = { $gte: minPrice, $lte: maxPrice };
        
        // Execute query with pagination
        const [tours, totalTours, startingCities, settings] = await Promise.all([
            Tour.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
            Tour.countDocuments(query),
            StartingCity.find().sort({ city: 1 }),
            Setting.findOne()
        ]);
        
        // Calculate pagination values
        const totalPages = Math.ceil(totalTours / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

          res.render('pages/tours', {
            title: 'Morocco Tours and Travel Packages',
               tours,
            pagination: {
                page,
                limit,
                totalTours,
                totalPages,
                hasNextPage,
                hasPrevPage
            },
               filters: {
                city,
                duration,
                minPrice,
                maxPrice
            },
            startingCities
          });
     } catch (error) {
        console.error('Error fetching tours:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load tours'
        });
    }
});

router.get('/tours/:slug', async (req, res, next) => {
    try {
        const tour = await Tour.findOne({ 
            $or: [
                { slug: req.params.slug },
                { _id: mongoose.isValidObjectId(req.params.slug) ? req.params.slug : null }
            ] 
        });

          if (!tour) {
            return next(); // Pass to 404 handler
        }
        
        // Get related tours from same starting city
        const relatedTours = await Tour.find({ 
            _id: { $ne: tour._id },
            startLocation: tour.startLocation 
        }).limit(3);
        
        res.render('pages/tour-details', {
               title: tour.title,
               tour,
               relatedTours,
               metaKeywords: `morocco tours, ${tour.startLocation} tours, morocco travel, ${tour.duration} day tours, ${tour.title}, desert adventure`
          });
     } catch (error) {
        console.error('Error fetching tour:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load tour details'
        });
    }
});

// Booking routes
router.get('/tour-booking/:id', csrfProtection, async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        
        if (!tour) {
            return res.status(404).render('error', {
                title: 'Not Found',
                message: 'The tour you are looking for does not exist.'
            });
        }
        
        res.render('bookings/booking-form', {
            title: `Book ${tour.title}`,
            tour,
            csrfToken: req.csrfToken()
        });
    } catch (error) {
        console.error('Error loading booking form:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load booking form'
        });
    }
});

router.post('/tour-booking', csrfProtection, async (req, res) => {
    try {
        const { tourId, fullName, email, phone, travelDate, adults, children, specialRequests } = req.body;
        
        // Fetch the tour
        const tour = await Tour.findById(tourId);
          if (!tour) {
               req.flash('error', 'Tour not found');
               return res.redirect('/tours');
          }

        // Create booking
          const booking = new Booking({
            tour: tourId,
            customerInfo: {
                fullName,
                email,
                phone
            },
            bookingDetails: {
                travelDate: new Date(travelDate),
                adults: parseInt(adults),
                children: parseInt(children),
                specialRequests
            },
            status: 'pending'
          });

          await booking.save();

        // Generate and send confirmation email
        // await sendConfirmationEmail(booking, tour);
        
        // Redirect to confirmation page
        res.redirect(`/booking/confirmation/${booking._id}`);
     } catch (error) {
        console.error('Error processing booking:', error);
        req.flash('error', 'Error processing booking. Please try again.');
        res.redirect(`/tour-booking/${req.body.tourId}`);
    }
});

router.get('/booking/confirmation/:id', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id).populate('tour');

          if (!booking) {
            return res.status(404).render('error', {
                title: 'Not Found',
                message: 'Booking not found'
            });
          }

          res.render('bookings/confirmation', {
               title: 'Booking Confirmation',
            booking
          });
     } catch (error) {
        console.error('Error showing confirmation:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load booking confirmation'
          });
     }
});

// Legal pages
router.get('/privacy', (req, res) => {
    res.render('pages/privacy', { title: 'Privacy Policy' });
});

router.get('/terms', (req, res) => {
    res.render('pages/terms', { title: 'Terms and Conditions' });
});

// Reviews route
router.get('/reviews', async (req, res) => {
  try {
    const googleMapsUrl = 'https://www.google.com/maps/place/Morocco+Travel+Experts/@31.6294,-7.9810,15z';
    const reviewsData = await scrapeGoogleReviews(googleMapsUrl, process.env.FIRECRAWL_API_KEY);
    
    res.render('reviews', {
      title: 'Customer Reviews - Morocco Travel Experts',
      description: 'Read authentic reviews from our satisfied customers about their experiences with Morocco Travel Experts.',
      ...reviewsData
    });
  } catch (error) {
    console.error('Error in reviews route:', error);
    res.status(500).render('error', {
      message: 'Failed to load reviews',
      error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
    });
  }
});

module.exports = router;