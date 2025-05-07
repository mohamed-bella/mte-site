// controllers/homeController.js
const Tour = require('../models/Tour');
const Setting = require('../models/Setting');
const StartingCity = require('../models/StartingCity');
const Blog = require('../models/Blog');
const { scrapeGoogleReviews } = require('../utils/reviewScraper');

exports.getHomePage = async (req, res) => {
    try {
        // Fetch tours, starting cities, and reviews in parallel
        const [tours, startingCities, settings, recentBlogs] = await Promise.all([
            Tour.find({ hidden: { $ne: true } }).limit(6).sort({ createdAt: -1 }),
            StartingCity.find().sort({ name: 1 }),
            Setting.findOne(),
            Blog.find({ isPublished: true }).sort({ publishedAt: -1 }).limit(3)
        ]);

        // Fetch Google reviews if enabled
        let googleReviews = [];
        if (settings && settings.enableGoogleReviews) {
            try {
                googleReviews = await scrapeGoogleReviews();
            } catch (reviewError) {
                console.error('Error fetching Google reviews:', reviewError);
                // Don't fail the entire page if reviews cannot be fetched
            }
        }

        res.render('pages/home', {
            title: 'Morocco Travel Experts',
            tours,
            startingCities,
            reviews: googleReviews,
            settings,
            recentBlogs
        });
    } catch (error) {
        console.error('Error fetching home page data:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading home page. Please try again later.'
        });
    }
};

exports.getAboutPage = (req, res) => {
     res.render('pages/about', {
          title: 'About Us'
     });
};

exports.getContactPage = (req, res) => {
     res.render('pages/contact', {
          title: 'Contact Us'
     });
};

exports.submitContactForm = async (req, res) => {
     try {
          // Handle contact form submission
          // You might want to save to DB or send email
          req.flash('success', 'Message sent successfully');
          res.redirect('/contact');
     } catch (error) {
          req.flash('error', 'Error sending message');
          res.redirect('/contact');
     }
};