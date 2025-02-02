// controllers/homeController.js
const Tour = require('../models/Tour');

exports.getHomePage = async (req, res) => {
     try {
          const featuredTours = await Tour.find({ featured: true }).limit(6);
          res.render('home', {
               title: 'Welcome to Morocco Tours',
               featuredTours
          });
     } catch (error) {
          res.status(500).render('error', { error });
     }
};

exports.getAboutPage = (req, res) => {
     res.render('about', {
          title: 'About Us'
     });
};

exports.getContactPage = (req, res) => {
     res.render('contact', {
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