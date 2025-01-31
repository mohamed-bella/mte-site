const express = require('express');
const app = express();
const path = require('path');

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// Import tour data
const tours = require('./data/tours.json');

// Routes
app.get('/', (req, res) => {
     res.render('pages/home', {
          title: 'Home',
          body: 'home', // Pass the body variable
          tours
     });
});

app.get('/about', (req, res) => {
     res.render('pages/about', {
          title: 'About Us',
          body: 'about' // Pass the body variable
     });
});

app.get('/tours', (req, res) => {
     res.render('pages/tours', {
          title: 'Our Tours',
          body: 'tours', // Pass the body variable
          tours
     });
});

app.get('/tours/:id', (req, res) => {
     const tourId = req.params.id.toLowerCase();
     const tour = tours.find(t => t.id.toLowerCase() === tourId);

     if (!tour) {
          return res.status(404).render('pages/error', {
               title: "Tour Not Found",
               error: {
                    status: 404,
                    message: "The requested tour could not be found"
               }
          });
     }

     res.render('pages/tour-details', {
          title: tour.title,
          tour,
          metaDescription: tour.description.substring(0, 160),
          photos: tour.photos,
          itinerary: tour.itinerary
     });
});

app.get('/contact', (req, res) => {
     res.render('pages/contact', {
          title: 'Contact Us',
          body: 'contact' // Pass the body variable
     });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
     console.log(`Server is running on http://localhost:${PORT}`);
});