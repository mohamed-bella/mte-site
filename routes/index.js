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


dotenv.config();



// Middleware to load settings
const loadSettings = async (req, res, next) => {
     try {
          const settings = await Setting.findOne();
          res.locals.settings = settings;
          next();
     } catch (error) {
          console.error('Error loading settings:', error);
          next();
     }
};

router.use(loadSettings);

// Home page
router.get('/', async (req, res) => {
     try {
          // Get featured tours for homepage
          const featuredTours = await Tour.find({ featured: true })
               .limit(6);

          // Get starting cities
          const startingCities = await StartingCity.find()
               .populate('tours', 'title');

         

          // Get settings with location information
          const settings = await Setting.findOne();
          // console.log(startingCities)
          
          res.render('pages/home', {
               title: settings?.siteTitle || 'Welcome to Morocco Tours',
               tours: featuredTours,
               startingCities: startingCities,
               metaTitle: settings?.metaTitle,
               metaDescription: settings?.metaDescription,
               metaKeywords: settings?.metaKeywords,
               location: {
                    address: settings?.address || '123 Tourism Street, Marrakech Medina',
                    coordinates: settings?.coordinates || {
                         lat: 31.631044981330687,
                         lng: -7.989843684885611
                    }
               }
          });
     } catch (error) {
          console.error('Homepage error:', error);
          res.render('pages/home', {
               title: 'Welcome to Morocco Tours',
               tours: [],
               startingCities: [],
               startCities: [],
               metaTitle: '',
               metaDescription: '',
               metaKeywords: '',
               location: {
                    address: '123 Tourism Street, Marrakech Medina',
                    coordinates: {
                         lat: 31.631044981330687,
                         lng: -7.989843684885611
                    }
               }
          });
     }
});

// All tours page
router.get('/tours', async (req, res) => {
     try {
          let tours = [];
          let query = {};
          
          // Get all starting cities for the filter dropdown
          const allStartingCities = await StartingCity.find().select('city');
          
          // Apply filters
          if (req.query.city) {
               const startingCity = await StartingCity.findOne({ city: req.query.city })
                    .populate({
                         path: 'tours',
                         match: {
                              $and: [
                                   // Price filter
                                   req.query.minPrice ? { price: { $gte: parseInt(req.query.minPrice) } } : {},
                                   req.query.maxPrice ? { price: { $lte: parseInt(req.query.maxPrice) } } : {},
                                   // Duration filter
                                   req.query.minDays ? { duration: { $gte: parseInt(req.query.minDays) } } : {},
                                   req.query.maxDays ? { duration: { $lte: parseInt(req.query.maxDays) } } : {}
                              ]
                         }
                    });
               
               if (startingCity) {
                    tours = startingCity.tours;
               }
          } else {
               // If no city filter, get all tours from all starting cities with filters
               const startingCities = await StartingCity.find()
                    .populate({
                         path: 'tours',
                         match: {
                              $and: [
                                   // Price filter
                                   req.query.minPrice ? { price: { $gte: parseInt(req.query.minPrice) } } : {},
                                   req.query.maxPrice ? { price: { $lte: parseInt(req.query.maxPrice) } } : {},
                                   // Duration filter
                                   req.query.minDays ? { duration: { $gte: parseInt(req.query.minDays) } } : {},
                                   req.query.maxDays ? { duration: { $lte: parseInt(req.query.maxDays) } } : {}
                              ]
                         }
                    });
               
               // Combine all tours from all cities, removing duplicates
               const tourSet = new Set();
               startingCities.forEach(city => {
                    city.tours.forEach(tour => {
                         tourSet.add(tour);
                    });
               });
               tours = Array.from(tourSet);
          }

          // Sort tours if requested
          if (req.query.sort) {
               switch(req.query.sort) {
                    case 'price-asc':
                         tours.sort((a, b) => a.price - b.price);
                         break;
                    case 'price-desc':
                         tours.sort((a, b) => b.price - a.price);
                         break;
                    case 'duration-asc':
                         tours.sort((a, b) => a.duration - b.duration);
                         break;
                    case 'duration-desc':
                         tours.sort((a, b) => b.duration - a.duration);
                         break;
               }
          }

          res.render('pages/tours', {
               title: 'Our Tours',
               tours,
               metaTitle: res.locals.settings?.metaTitle,
               metaDescription: res.locals.settings?.metaDescription,
               metaKeywords: res.locals.settings?.metaKeywords,
               selectedCity: req.query.city,
               filters: {
                    minPrice: req.query.minPrice,
                    maxPrice: req.query.maxPrice,
                    minDays: req.query.minDays,
                    maxDays: req.query.maxDays,
                    sort: req.query.sort
               },
               startingCities: allStartingCities
          });
     } catch (error) {
          console.error('Tours page error:', error);
          req.flash('error', 'Error loading tours');
          res.redirect('/');
     }
});

// Single tour page
router.get('/tours/:slug', async (req, res) => {
     try {
          const tour = await Tour.findOne({ slug: req.params.slug });

          if (!tour) {
               req.flash('error', 'Tour not found');
               return res.redirect('/tours');
          }
          console.log(tour.mapCoordinates)

          res.render('pages/tour-details', {
               title: tour.title,
               tour,
               metaTitle: res.locals.settings?.metaTitle,
               metaDescription: res.locals.settings?.metaDescription,
               metaKeywords: res.locals.settings?.metaKeywords
          });
     } catch (error) {
          console.error('Tour detail error:', error);
          req.flash('error', 'Error loading tour');
          res.redirect('/tours');
     }
});

// Process booking
router.post('/tours/:slug/book', async (req, res) => {
     try {
          const tour = await Tour.findOne({ slug: req.params.slug });

          if (!tour) {
               req.flash('error', 'Tour not found');
               return res.redirect('/tours');
          }

          const booking = new Booking({
               tour: tour._id,
               firstName: req.body.firstName,
               lastName: req.body.lastName,
               email: req.body.email,
               date: new Date(req.body.date),
               groupSize: req.body.groupSize,
               specialRequests: req.body.specialRequests,
               totalPrice: tour.price * req.body.groupSize
          });

          await booking.save();

          // Send confirmation email
          const emailContent = `
               Dear ${booking.firstName} ${booking.lastName},

               Thank you for booking your tour with Morocco Travel Experts!

               Booking Details:
               - Tour: ${tour.title}
               - Date: ${booking.date.toLocaleDateString()}
               - Number of People: ${booking.groupSize}
               - Total Price: $${booking.totalPrice}

               You can view your booking confirmation at:
               https://moroccotravelexperts.com/bookings/${booking._id}/confirmation

               If you have any questions, please don't hesitate to contact us.

               Best regards,
               Morocco Travel Experts Team
          `;

          // Create nodemailer transporter
          const transporter = nodemailer.createTransport({
               host: process.env.EMAIL_HOST,
               port: process.env.EMAIL_PORT,
               secure: true,
               auth: {

                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS

               }
          });

          await transporter.sendMail({
               from: process.env.EMAIL_USER,
               to: booking.email,
               subject: `Booking Confirmation - ${tour.title}`,
               text: emailContent
          });




          req.flash('success', 'Booking submitted successfully. Check your email for confirmation.');
          res.redirect(`/bookings/${booking._id}/confirmation`);
     } catch (error) {
          console.error('Booking error:', error);
          req.flash('error', 'Error processing booking');
          res.redirect('back');
     }
});

// Booking confirmation page
router.get('/bookings/:id/confirmation', async (req, res) => {
     try {
          const booking = await Booking.findById(req.params.id)
               .populate('tour');

          if (!booking) {
               req.flash('error', 'Booking not found');
               return res.redirect('/');
          }

          res.render('bookings/confirmation', {
               title: 'Booking Confirmation',
               booking,
               metaTitle: res.locals.settings?.metaTitle,
               metaDescription: res.locals.settings?.metaDescription,
               metaKeywords: res.locals.settings?.metaKeywords
          });
     } catch (error) {
          console.error('Confirmation error:', error);
          req.flash('error', 'Error loading confirmation');
          res.redirect('/');
     }
});

router.get('/bookings/:id/download-pdf', async (req, res) => {
     try {
          const booking = await Booking.findById(req.params.id).populate('tour');

          if (!booking) {
               req.flash('error', 'Booking not found');
               return res.redirect('/bookings');
          }

          // Read the PDF template
          const templatePath = path.join(__dirname, '../views/bookings/pdf-template.ejs');
          const template = await ejs.renderFile(templatePath, { 
               booking,
               settings: res.locals.settings 
          });

          // PDF configuration
          const options = {
               format: 'A4',
               border: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
               },
               footer: {
                    height: '20mm',
                    contents: {
                         default: '<div style="text-align: center; font-size: 12px;">Page {{page}} of {{pages}}</div>'
                    }
               }
          };

          // Generate PDF
          pdf.create(template, options).toBuffer((err, buffer) => {
               if (err) {
                    console.log(err)
                    req.flash('error', 'Error generating PDF');
                    return res.redirect('/bookings/' + booking._id + '/confirmation');
               }

               // Send the PDF
               res.setHeader('Content-Type', 'application/pdf');
               res.setHeader('Content-Disposition', `attachment; filename="booking-${booking._id}.pdf"`);
               res.send(buffer);
          });
     } catch (error) {
          req.flash('error', 'Error generating PDF');
          res.redirect('/bookings/confirmation/' + req.params.id);
     }
});

// About page
router.get('/about', (req, res) => {
     res.render('pages/about', {
          title: 'About Us',
          metaTitle: res.locals.settings?.metaTitle,
          metaDescription: res.locals.settings?.metaDescription,
          metaKeywords: res.locals.settings?.metaKeywords
     });
});

// Contact page
router.get('/contact', (req, res) => {
     res.render('pages/contact', {
          title: 'Contact Us',
          metaTitle: res.locals.settings?.metaTitle,
          metaDescription: res.locals.settings?.metaDescription,
          metaKeywords: res.locals.settings?.metaKeywords
     });
});

// Process contact form
router.post('/contact', async (req, res) => {
     try {
          // Here you would typically handle the contact form
          // e.g., send an email or save to database

          req.flash('success', 'Message sent successfully');
          res.redirect('/contact');
     } catch (error) {
          console.error('Contact form error:', error);
          req.flash('error', 'Error sending message');
          res.redirect('/contact');
     }
});

// Privacy policy
router.get('/privacy', (req, res) => {
     res.render('pages/privacy', {
          title: 'Privacy Policy',
          metaTitle: res.locals.settings?.metaTitle,
          metaDescription: res.locals.settings?.metaDescription,
          metaKeywords: res.locals.settings?.metaKeywords
     });
});

// Terms and conditions
router.get('/terms', (req, res) => {
     res.render('pages/terms', {
          title: 'Terms and Conditions',
          metaTitle: res.locals.settings?.metaTitle,
          metaDescription: res.locals.settings?.metaDescription,
          metaKeywords: res.locals.settings?.metaKeywords
     });
});

module.exports = router;