const express = require('express');
const router = express.Router();
const CustomTourRequest = require('../models/CustomTourRequest');
const Booking = require('../models/Booking');
const Tour = require('../models/Tour');
const nodemailer = require('nodemailer');
const path = require('path');
const ejs = require('ejs');
const axios = require('axios'); // Add axios for HTTP requests
const crypto = require('crypto');

// Helper function to generate a confirmation code
function generateConfirmationCode() {
    // Generate a random 6-character alphanumeric code
    return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// Helper function to send WhatsApp notification
async function sendWhatsAppNotification(message) {
    // Phone number to API key mapping
    const phoneConfigs = [
        { phone: '212704969534', apiKey: '1595998' },
        { phone: '212632244668', apiKey: '7574261' }  // New number with its specific API key
    ];
    
    try {
        // Send to all phone numbers with their respective API keys
        const promises = phoneConfigs.map(async (config) => {
            const apiUrl = `https://api.callmebot.com/whatsapp.php?phone=${config.phone}&text=${encodeURIComponent(message)}&apikey=${config.apiKey}`;
            return axios.get(apiUrl);
        });
        
        // Wait for all requests to complete
        const responses = await Promise.all(promises);
        console.log('WhatsApp notifications sent successfully to all numbers');
        return responses;
    } catch (error) {
        console.error('Error sending WhatsApp notification:', error);
    }
}

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
            specialRequests,
            calculatedPrice
        } = req.body;

        // Find the tour
        const tour = await Tour.findById(tourId);
        if (!tour) {
            return res.status(404).json({
                success: false,
                message: 'Tour not found'
            });
        }
        
        // Validate and calculate the price server-side for security
        const numGuests = parseInt(groupSize) || 1;
        const basePrice = tour.price * numGuests;
        let serverCalculatedPrice = basePrice;
        let discount = 0;
        
        // Apply the same discount rules as the frontend
        if (numGuests > 1) {
            // Calculate discount - 9% per additional person
            discount = tour.price * (numGuests - 1) * 0.09;
            serverCalculatedPrice = basePrice - discount;
        }
        
        // Round to 2 decimal places to match frontend calculation
        serverCalculatedPrice = Math.round(serverCalculatedPrice * 100) / 100;
        
        // Optional: Verify that the frontend calculation isn't too far off from server
        // Add a small tolerance for floating point errors
        const clientCalculatedPrice = parseFloat(calculatedPrice) || 0;
        if (Math.abs(serverCalculatedPrice - clientCalculatedPrice) > 1) {
            console.warn(`Price mismatch detected: Client sent ${clientCalculatedPrice}, server calculated ${serverCalculatedPrice}`);
        }
        
        // Always use the server-calculated price for security
        const finalPrice = serverCalculatedPrice;
        
        // Generate a confirmation code for the booking
        const confirmationCode = generateConfirmationCode();

        // Create new booking with pending_payment status
        const booking = new Booking({
            tour: tourId,
            name: `${firstName} ${lastName}`,
            email,
            phone,
            travelDate: new Date(startDate),
            groupSize: numGuests,
            notes: specialRequests || '',
            status: 'pending_payment', // Set initial status to pending_payment
            tourType: 'standard_tour',
            source: 'website',
            // Add pricing details to the booking
            pricing: {
                basePrice: basePrice,
                discount: discount,
                finalPrice: finalPrice
            },
            // Add payment information
            payment: {
                status: 'pending',
                method: 'paypal',
                confirmationCode: confirmationCode
            }
        });

        await booking.save();
        console.log('Booking saved successfully:', booking._id);

        // Return JSON response for AJAX with payment data
        return res.status(200).json({
            success: true,
            message: 'Your booking has been created. Please complete payment to confirm your reservation.',
            bookingId: booking._id,
            finalPrice: finalPrice.toFixed(2),
            tourTitle: tour.title,
            customerName: `${firstName} ${lastName}`,
            confirmationCode: confirmationCode,
            paymentPending: true, // Flag to indicate payment is needed
            redirectUrl: `/booking/${booking._id}/confirmation`
        });
    } catch (error) {
        console.error('Booking error:', error);
        return res.status(500).json({
            success: false,
            message: 'There was an error processing your booking. Please try again or contact us directly.'
        });
    }
});

// POST route for custom tour requests
router.post('/custom-request', async (req, res) => {
    try {
        console.log('Received custom tour request:', req.body);
        
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
        
        // Validate required fields
        if (!customName || !customEmail || !customMessage) {
            console.error('Missing required fields in custom request');
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: name, email, and message.'
            });
        }

        // Format customizations
        let formattedCustomizations = [];
        if (Array.isArray(customizations) && customizations.length > 0) {
            formattedCustomizations = customizations;
        } else if (customizations && typeof customizations === 'string') {
            formattedCustomizations = [customizations];
        } else {
            formattedCustomizations = ['Custom tour request'];
        }

        // Create new custom tour request
        const newRequest = new CustomTourRequest({
            name: customName,
            email: customEmail,
            customizations: formattedCustomizations,
            message: customMessage,
            travelDate: customDate || null,
            budget: customBudget,
            baseTour: tourId || null,
            baseTourName: tourName || null
        });

        await newRequest.save();
        console.log('Custom tour request saved with ID:', newRequest._id);

        // Format the customizations for WhatsApp
        const customizationsList = formattedCustomizations.map(item => `  • ${item}`).join('\n');

        // Send WhatsApp notification with improved formatting
        const siteUrl = process.env.BASE_URL || 'https://moroccotravelexperts.com';
        const notificationMessage = `🔴 *NEW CUSTOM TOUR REQUEST* 🔴\n\n` +
            `👤 *Customer:* ${customName}\n` +
            `📧 *Email:* ${customEmail}\n` +
            `🏆 *Based on Tour:* ${tourName || 'Custom Inquiry'}\n` +
            `\n🔹 *Customization Requests:*\n${customizationsList}\n` +
            `\n💬 *Customer Message:*\n${customMessage}\n\n` +
            `📅 *Preferred Date:* ${customDate ? new Date(customDate).toLocaleDateString() : 'Not specified'}\n` +
            `💰 *Budget Range:* ${customBudget || 'Not specified'}\n\n` +
            `🔍 *Request ID:* ${newRequest._id}\n` +
            `🌐 *Check Admin:* ${siteUrl}/admin/custom-requests\n` +
            `⏰ *Requested:* ${new Date().toLocaleString()}`;
            
        // Send WhatsApp notification with proper error handling
        try {
            const result = await sendWhatsAppNotification(notificationMessage);
            console.log('WhatsApp notification sent for custom request');
        } catch (whatsappError) {
            console.error('Error sending WhatsApp notification:', whatsappError);
            // Continue - don't fail the request if WhatsApp notification fails
        }

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
        req.flash('error', 'Error loading booking confirmation');
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

// PayPal API Routes
// Create a PayPal payment order
router.post('/create-paypal-order', async (req, res) => {
    try {
        const { bookingId } = req.body;
        
        // Find booking
        const booking = await Booking.findById(bookingId).populate('tour');
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }
        
        // PayPal order details
        const orderDetails = {
            intent: 'CAPTURE',
            purchase_units: [{
                reference_id: booking._id.toString(),
                description: `Morocco Travel Experts - ${booking.tour ? booking.tour.title : 'Tour Booking'}`,
                amount: {
                    currency_code: 'USD',
                    value: booking.pricing.finalPrice.toFixed(2)
                }
            }],
            application_context: {
                brand_name: 'Morocco Travel Experts',
                shipping_preference: 'NO_SHIPPING'
            }
        };
        
        // Create PayPal order with Node.js SDK using Fetch API
        const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
        
        // Get PayPal access token first
        const tokenResponse = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });
        
        const tokenData = await tokenResponse.json();
        
        if (!tokenResponse.ok) {
            console.error('PayPal token error:', tokenData);
            return res.status(500).json({
                success: false,
                message: 'Error creating PayPal token'
            });
        }
        
        // Create order with the token
        const response = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderDetails)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('PayPal order error:', data);
            return res.status(500).json({
                success: false,
                message: 'Error creating PayPal order'
            });
        }
        
        res.json({
            success: true,
            orderId: data.id
        });
    } catch (error) {
        console.error('PayPal order creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating PayPal order'
        });
    }
});

// Capture PayPal payment
router.post('/capture-paypal-payment', async (req, res) => {
    try {
        const { orderID, bookingId } = req.body;
        
        // Find booking
        const booking = await Booking.findById(bookingId).populate('tour');
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }
        
        // Get PayPal access token
        const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
        const tokenResponse = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });
        
        const tokenData = await tokenResponse.json();
        
        if (!tokenResponse.ok) {
            console.error('PayPal token error:', tokenData);
            return res.status(500).json({
                success: false,
                message: 'Error getting PayPal token'
            });
        }
        
        // Capture the order
        const response = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('PayPal capture error:', data);
            return res.status(500).json({
                success: false,
                message: 'Error capturing PayPal payment'
            });
        }
        
        // Update booking with payment information
        booking.status = 'paid';
        booking.payment.status = 'completed';
        booking.payment.transactionId = data.purchase_units[0].payments.captures[0].id;
        booking.payment.paymentDate = new Date();
        await booking.save();
        
        // Send WhatsApp notification with payment confirmation
        const siteUrl = process.env.BASE_URL || 'https://moroccotravelexperts.com';
        const bookingMessage = `💰 New Paid Booking!\n\n` +
            `🏆 Tour: ${booking.tour.title}\n` +
            `👤 Name: ${booking.name}\n` +
            `📧 Email: ${booking.email}\n` +
            `📞 Phone: ${booking.phone}\n` +
            `📅 Date: ${new Date(booking.travelDate).toLocaleDateString()}\n` +
            `👪 Group Size: ${booking.groupSize}\n` +
            `💲 Price: $${booking.tour.price} per person\n` +
            `💰 Discount: $${booking.pricing.discount.toFixed(2)}\n` +
            `💵 Total Paid: $${booking.pricing.finalPrice.toFixed(2)}\n` +
            `🧾 Confirmation Code: ${booking.payment.confirmationCode}\n` +
            `💳 Transaction ID: ${booking.payment.transactionId}\n` +
            `📝 Requests: ${booking.notes || 'None'}\n\n` +
            `🌐 Website: ${siteUrl}\n` +
            `⏰ Time: ${new Date().toLocaleString()}`;
            
        sendWhatsAppNotification(bookingMessage);
        
        res.json({
            success: true,
            confirmationCode: booking.payment.confirmationCode,
            bookingId: booking._id,
            tourTitle: booking.tour.title,
            finalPrice: booking.pricing.finalPrice.toFixed(2),
            whatsappLink: `https://wa.me/212704969534?text=Hello,%20I%20have%20just%20booked%20the%20${encodeURIComponent(booking.tour.title)}%20tour.%20My%20confirmation%20code%20is%20${booking.payment.confirmationCode}.%20Please%20confirm%20my%20reservation.%20Thank%20you!`
        });
    } catch (error) {
        console.error('PayPal capture error:', error);
        res.status(500).json({
            success: false,
            message: 'Error capturing PayPal payment'
        });
    }
});

module.exports = router; 