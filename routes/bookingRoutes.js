const express = require('express');
const router = express.Router();
const CustomTourRequest = require('../models/CustomTourRequest');
const Booking = require('../models/Booking');
const Tour = require('../models/Tour');
const nodemailer = require('nodemailer');
const path = require('path');
const ejs = require('ejs');

// Process standard booking
router.post('/', async (req, res) => {
    try {
        const {
            tourId,
            tourName,
            firstName,
            lastName,
            email,
            phone,
            startDate,
            groupSize,
            specialRequests
        } = req.body;

        // Find the tour
        const tour = await Tour.findById(tourId);
        if (!tour) {
            req.flash('error', 'Tour not found');
            return res.redirect('/tours');
        }

        // Create new booking
        const booking = new Booking({
            tour: tourId,
            firstName,
            lastName,
            email,
            phone,
            date: new Date(startDate),
            groupSize,
            specialRequests,
            status: 'pending',
            totalPrice: 0 // Default price as 0 for flexible pricing
        });

        await booking.save();

        // Send confirmation email (commented out for testing)
        // sendConfirmationEmail(booking, tour);

        req.flash('success', 'Booking submitted successfully. Check your email for confirmation.');
        res.redirect(`/bookings/${booking._id}/confirmation`);
    } catch (error) {
        console.error('Booking error:', error);
        req.flash('error', 'Error processing booking');
        res.redirect('back');
    }
});

// POST route for custom tour requests
router.post('/custom-request', async (req, res) => {
    try {
        const {
            customName, 
            customEmail,
            customizations,
            customMessage,
            customDate,
            customBudget,
            tourId,
            tourName
        } = req.body;

        // Create new custom tour request
        const newRequest = new CustomTourRequest({
            name: customName,
            email: customEmail,
            customizations: Array.isArray(customizations) ? customizations : [customizations],
            message: customMessage,
            travelDate: customDate || null,
            budget: customBudget,
            baseTour: tourId || null,
            baseTourName: tourName || null
        });

        await newRequest.save();

        // Optional: Send notification email to admin
        // await sendAdminNotification(newRequest);

        // Return success response
        return res.status(200).json({
            success: true,
            message: 'Your customization request has been submitted successfully!'
        });
    } catch (error) {
        console.error('Error creating custom tour request:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred. Please try again.'
        });
    }
});

// Booking confirmation page
router.get('/:id/confirmation', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('tour');

        if (!booking) {
            req.flash('error', 'Booking not found');
            return res.redirect('/');
        }

        res.render('bookings/confirmation', {
            title: 'Booking Confirmation',
            booking
        });
    } catch (error) {
        console.error('Confirmation error:', error);
        req.flash('error', 'Error loading confirmation');
        res.redirect('/');
    }
});

// Download PDF confirmation
router.get('/:id/download-pdf', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id).populate('tour');

        if (!booking) {
            req.flash('error', 'Booking not found');
            return res.redirect('/bookings');
        }

        // Read the PDF template
        const templatePath = path.join(__dirname, '../views/bookings/pdf-template.ejs');
        const template = await ejs.renderFile(templatePath, { booking });

        // Return the rendered template for now since we can't generate a PDF in this context
        res.send(template);
    } catch (error) {
        req.flash('error', 'Error generating PDF');
        res.redirect('/bookings/' + req.params.id + '/confirmation');
    }
});

// Helper function to send confirmation email
async function sendConfirmationEmail(booking, tour) {
    // Create a transporter
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    // Email content
    const emailContent = `
        Dear ${booking.firstName} ${booking.lastName},

        Thank you for booking your tour with Morocco Travel Experts!

        Booking Details:
        - Tour: ${tour.title}
        - Date: ${booking.date.toLocaleDateString()}
        - Number of People: ${booking.groupSize}

        Our team will contact you shortly with pricing details and next steps.

        You can view your booking confirmation at:
        ${process.env.BASE_URL}/bookings/${booking._id}/confirmation

        If you have any questions, please don't hesitate to contact us.

        Best regards,
        Morocco Travel Experts Team
    `;

    // Send email
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: booking.email,
        subject: `Booking Confirmation - ${tour.title}`,
        text: emailContent
    });
}

// Helper function to notify admin of custom request
async function sendAdminNotification(customRequest) {
    // Create a transporter
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    // Email content
    const emailContent = `
        New Custom Tour Request

        Customer: ${customRequest.name}
        Email: ${customRequest.email}
        Base Tour: ${customRequest.baseTourName || 'Custom Inquiry'}
        
        Customization Areas: ${customRequest.customizations.join(', ')}
        
        Message:
        ${customRequest.message || 'No additional message provided'}
        
        Requested Travel Date: ${customRequest.travelDate ? new Date(customRequest.travelDate).toLocaleDateString() : 'Not specified'}
        Budget Range: ${customRequest.budget || 'Not specified'}
        
        View this request in the admin dashboard:
        ${process.env.BASE_URL}/admin/custom-requests/${customRequest._id}
    `;

    // Send email
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
        subject: `New Custom Tour Request - ${customRequest.name}`,
        text: emailContent
    });
}

module.exports = router; 