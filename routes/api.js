const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const Booking = require('../models/Booking');
const mongoose = require('mongoose');
const axios = require('axios');
const emailUtils = require('../utils/email');
require('dotenv').config();
// const { isAuthenticated } = require('../middlewares/auth');

// Configure SendGrid if API key is available
if (process.env.EMAIL_API === 'sendgrid' && process.env.EMAIL_API_KEY) {
    sgMail.setApiKey(process.env.EMAIL_API_KEY);
}

// Helper function to send emails using the configured method
const sendEmails = async (adminMailOptions, customerMailOptions) => {
    // Check if SendGrid is configured
    if (process.env.EMAIL_API === 'sendgrid' && process.env.EMAIL_API_KEY) {
        console.log('Sending emails via SendGrid API');
        // Format for SendGrid
        const adminMsg = {
            to: adminMailOptions.to,
            from: {
                email: process.env.SENDER_EMAIL || 'noreply@moroccotravelexperts.com',
                name: process.env.SENDER_NAME || 'Morocco Travel Experts'
            },
            subject: adminMailOptions.subject,
            html: adminMailOptions.html
        };
        
        const customerMsg = {
            to: customerMailOptions.to,
            from: {
                email: process.env.SENDER_EMAIL || 'noreply@moroccotravelexperts.com',
                name: process.env.SENDER_NAME || 'Morocco Travel Experts'
            },
            subject: customerMailOptions.subject,
            html: customerMailOptions.html
        };
        
        // Send both emails
        await Promise.all([
            sgMail.send(adminMsg),
            sgMail.send(customerMsg)
        ]);
        
        return;
    }
    
    // Fall back to SMTP/Nodemailer if SendGrid is not configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log('Sending emails via SMTP (Nodemailer)');
        // Create nodemailer transporter with SSL/TLS options
        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                // Do not fail on invalid certs
                rejectUnauthorized: false
            }
        });
        
        // Send emails
        await transporter.sendMail(adminMailOptions);
        await transporter.sendMail(customerMailOptions);
        return;
    }
    
    // No email method configured
    throw new Error('No email service configured');
};

// Booking inquiry endpoint for the hero form
router.post('/booking-inquiry', async (req, res) => {
    try {
        const { name, email, startingCity, travelDate, source } = req.body;
        
        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Name and email are required'
            });
        }
        
        // Create new booking in database
        const booking = new Booking({
            name,
            email,
            tourType: 'custom_tour', // Default to custom tour
            travelDate: travelDate ? new Date(travelDate) : null,
            source: source || 'website',
            status: 'new',
            customTour: {
                destinations: [],
                activities: [],
                travelerCount: 1,
                duration: '7-10 days',
                budget: 'medium',
                accommodationPreference: 'mid-range'
            }
        });
        
        // If starting city is provided, add it to destinations
        if (startingCity) {
            try {
                const city = await mongoose.model('StartingCity').findById(startingCity);
                if (city) {
                    booking.customTour.destinations = [city.city];
                }
            } catch (cityError) {
                console.error('Error finding starting city:', cityError);
                // Continue with booking creation even if city lookup fails
            }
        }
        
        await booking.save();
        
        // Attempt to send notification email to admin
        try {
            const transporter = nodemailer.createTransport({
                service: process.env.EMAIL_SERVICE,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                },
                tls: {
                    rejectUnauthorized: false
                }
            });
            
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
                subject: 'New Booking Inquiry',
                html: `
                    <h2>New Booking Inquiry</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Travel Date:</strong> ${travelDate || 'Not specified'}</p>
                    <p><strong>Source:</strong> ${source || 'Website'}</p>
                    <p><a href="${process.env.SITE_URL}/admin/bookings/${booking._id}">View in Admin Panel</a></p>
                `
            });
        } catch (emailError) {
            console.error('Error sending email notification:', emailError);
            // Don't fail the API response if email fails
        }
        
        return res.json({
            success: true,
            message: 'Booking inquiry received',
            bookingId: booking._id
        });
    } catch (error) {
        console.error('Error creating booking inquiry:', error);
        return res.status(500).json({
            success: false,
            message: 'Error processing your request'
        });
    }
});

// Custom tour booking endpoint
router.post('/custom-booking', async (req, res) => {
    try {
        const { 
            name, email, phone, 
            destinations, activities, 
            travelerCount, travelDate, 
            duration, budget, 
            accommodationPreference, additionalNotes 
        } = req.body;

        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Name and email are required fields'
            });
        }

        // Create new custom booking in database
        const newBooking = new Booking({
            name,
            email,
            phone,
            tourType: 'custom',
            travelDate: travelDate ? new Date(travelDate) : null,
            status: 'new',
            source: 'custom_tour_builder',
            customTour: {
                destinations: destinations || [],
                activities: activities || [],
                travelerCount: travelerCount || 1,
                duration: duration || '7-10 days',
                budget: budget || 'medium',
                accommodationPreference: accommodationPreference || 'mid-range',
                additionalNotes: additionalNotes || ''
            }
        });

        await newBooking.save();

        // Check if any email method is configured
        const hasEmailConfig = (process.env.EMAIL_API === 'sendgrid' && process.env.EMAIL_API_KEY) || 
                              (process.env.EMAIL_USER && process.env.EMAIL_PASS);
        
        // Only attempt to send emails if credentials are available
        if (hasEmailConfig) {
            try {
                console.log('Attempting to send custom tour emails');
                
                // Format destinations and activities for email
                const destinationsList = destinations && destinations.length 
                    ? destinations.join(', ') 
                    : 'Not specified';
                    
                const activitiesList = activities && activities.length 
                    ? activities.join(', ') 
                    : 'Not specified';

                // Email content for admin
                const adminMailOptions = {
                    from: process.env.EMAIL_USER || process.env.SENDER_EMAIL,
                    to: process.env.ADMIN_EMAIL || 'admin@moroccotravelexperts.com',
                    subject: 'New Custom Tour Request',
                    html: `
                        <h2>New Custom Tour Request</h2>
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                        <p><strong>Travel Date:</strong> ${travelDate || 'Not specified'}</p>
                        <p><strong>Duration:</strong> ${duration || 'Not specified'}</p>
                        <p><strong>Number of Travelers:</strong> ${travelerCount || 'Not specified'}</p>
                        <p><strong>Budget:</strong> ${budget || 'Not specified'}</p>
                        <p><strong>Accommodation Preference:</strong> ${accommodationPreference || 'Not specified'}</p>
                        <p><strong>Destinations:</strong> ${destinationsList}</p>
                        <p><strong>Activities:</strong> ${activitiesList}</p>
                        <p><strong>Additional Notes:</strong> ${additionalNotes || 'None'}</p>
                        <p>Please respond to this customer within 24 hours with a custom itinerary.</p>
                    `
                };

                // Email content for customer
                const customerMailOptions = {
                    from: process.env.EMAIL_USER || process.env.SENDER_EMAIL,
                    to: email,
                    subject: 'Your Custom Morocco Tour Request',
                    html: `
                        <h2>Thank You for Your Custom Tour Request</h2>
                        <p>Dear ${name},</p>
                        <p>Thank you for choosing Morocco Travel Experts to plan your custom journey to Morocco. We have received your request and are excited to help you create the perfect itinerary.</p>
                        <p>Here's a summary of what you've shared with us:</p>
                        <ul>
                            ${destinations && destinations.length ? `<li><strong>Destinations of Interest:</strong> ${destinationsList}</li>` : ''}
                            ${activities && activities.length ? `<li><strong>Activities of Interest:</strong> ${activitiesList}</li>` : ''}
                            ${duration ? `<li><strong>Trip Duration:</strong> ${duration}</li>` : ''}
                            ${travelerCount ? `<li><strong>Number of Travelers:</strong> ${travelerCount}</li>` : ''}
                            ${travelDate ? `<li><strong>Approximate Travel Date:</strong> ${travelDate}</li>` : ''}
                        </ul>
                        <p>One of our Morocco specialists will craft a personalized itinerary based on your preferences and contact you within 24-48 hours.</p>
                        <p>If you have any immediate questions, please don't hesitate to contact us at <a href="mailto:info@moroccotravelexperts.com">info@moroccotravelexperts.com</a>.</p>
                        <p>Best regards,<br>The Morocco Travel Experts Team</p>
                    `
                };

                // Send emails using the helper function
                await sendEmails(adminMailOptions, customerMailOptions);
                console.log('Custom tour emails sent successfully');
            } catch (emailError) {
                // Log email error but don't fail the booking process
                console.error('Error sending custom tour emails:', emailError);
                // Update booking to indicate emails failed
                await Booking.findByIdAndUpdate(newBooking._id, {
                    $set: { 
                        notes: 'Custom tour booking created but confirmation emails failed to send: ' + emailError.message 
                    }
                });
            }
        } else {
            console.warn('Email not configured: Skipping email notifications');
            await Booking.findByIdAndUpdate(newBooking._id, {
                $set: { 
                    notes: 'Custom tour booking created but email notifications skipped due to missing email configuration' 
                }
            });
        }

        // Return success response even if email sending failed
        return res.json({
            success: true,
            message: 'Your custom tour request has been received! We will contact you soon with a personalized itinerary.',
            data: {
                booking_id: newBooking._id
            }
        });
    } catch (error) {
        console.error('Custom booking error:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while processing your request',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// DeepSeek API integration for generating travel itineraries
router.post('/generate-itinerary', async (req, res) => {
    try {
        const { 
            destinations, 
            activities, 
            travelers, 
            travelDate, 
            additionalInfo,
            tourDuration,
            startingCity,
            arrivalCity,
            email,
            name
        } = req.body;

        if (!destinations || destinations.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one destination is required' });
        }

        // Log request parameters for debugging
        console.log('Generate Itinerary Request:', { 
            destinations, 
            activities, 
            travelers, 
            email, 
            name 
        });

        // Construct the prompt for DeepSeek API
        const prompt = `
        Create a detailed multi-day travel itinerary for Morocco with the following parameters:
        
        DESTINATIONS: ${destinations.join(', ')}
        ACTIVITIES: ${activities ? activities.join(', ') : 'No specific activities selected'}
        NUMBER OF TRAVELERS: ${travelers || '2'}
        TRAVEL DATE: ${travelDate || 'Not specified'}
        TOUR DURATION: ${tourDuration || '7'} days
        STARTING CITY: ${startingCity || 'Casablanca'}
        ARRIVAL CITY: ${arrivalCity || 'Marrakech'}
        ADDITIONAL INFORMATION: ${additionalInfo || 'None provided'}
        
        Please create a comprehensive day-by-day itinerary with the following:
        1. A logical route between destinations starting in ${startingCity || 'Casablanca'} and ending in ${arrivalCity || 'Marrakech'}
        2. The itinerary must be exactly ${tourDuration || '7'} days long
        3. Each day should include:
           - Morning, afternoon, and evening activities
           - Recommended local dining experiences
           - Cultural highlights
           - Approximate travel times between locations
        4. Factor in travel time realistically between destinations
        5. Include at least 3 unique activities from the selected list for each destination
        6. Format the response as a JSON object with this structure:
        {
          "title": "Personalized title for the trip",
          "summary": "Brief overview of the trip",
          "days": [
            {
              "day": 1,
              "location": "City name",
              "description": "Overview of the day",
              "activities": ["Activity 1", "Activity 2", "Activity 3"],
              "meals": {"breakfast": "...", "lunch": "...", "dinner": "..."},
              "accommodation": "Recommended stay"
            },
            // Additional days...
          ]
        }
        
        Make the itinerary feel authentic and personalized to Morocco.
        `;

        // Call the DeepSeek API
        const response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
                model: 'deepseek-chat',
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 4000
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
                }
            }
        );

        // Parse the response to get the generated itinerary
        let itinerary;
        try {
            // Extract JSON object from the text response
            const content = response.data.choices[0].message.content;
            // Find JSON content (might be wrapped in markdown code blocks)
            const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                             content.match(/```\n([\s\S]*?)\n```/) ||
                             content.match(/{[\s\S]*?}/);
                             
            const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
            itinerary = JSON.parse(jsonString);
        } catch (error) {
            console.error('Error parsing DeepSeek response:', error);
            // If parsing fails, return the raw text
            itinerary = { 
                error: 'Failed to parse JSON response',
                rawContent: response.data.choices[0].message.content
            };
        }

        // Create a booking record if email is provided
        let bookingId = null;
        if (email) {
            try {
                // Extract key information from the itinerary
                const destinationsList = [];
                if (itinerary.days && Array.isArray(itinerary.days)) {
                    // Get unique locations
                    itinerary.days.forEach(day => {
                        if (day.location && !destinationsList.includes(day.location)) {
                            destinationsList.push(day.location);
                        }
                    });
                }
                
                // Create booking in database
                const booking = new Booking({
                    name: name || 'Anonymous User',
                    email,
                    tourType: 'ai_customized',
                    travelDate: travelDate ? new Date(travelDate) : null,
                    source: 'ai_itinerary_generator',
                    status: 'new',
                    customTour: {
                        destinations: destinationsList.length > 0 ? destinationsList : destinations,
                        activities: activities || [],
                        travelerCount: parseInt(travelers) || 2,
                        duration: itinerary.days ? itinerary.days.length.toString() : tourDuration || '7',
                        budget: 'medium',
                        accommodationPreference: 'mid-range',
                        additionalNotes: additionalInfo || ''
                    },
                    aiItinerary: JSON.stringify(itinerary)
                });
                
                await booking.save();
                bookingId = booking._id;
                console.log('Created booking record:', bookingId);
                
                // Send email notification if email is provided
                if (email) {
                    try {
                        const emailResult = await emailUtils.sendTourGeneratedEmail({
                            email,
                            name: name || 'Traveler',
                            itinerary,
                            bookingId
                        });
                        
                        console.log('Tour generation email result:', emailResult.success ? 'Sent successfully' : 'Failed to send');
                    } catch (emailError) {
                        console.error('Error sending tour generation email:', emailError);
                        // Don't fail the API response if email fails
                    }
                }
            } catch (bookingError) {
                console.error('Error creating booking record:', bookingError);
                // Don't fail the API response if booking creation fails
            }
        }

        res.json({ 
            success: true, 
            itinerary,
            bookingId 
        });
    } catch (error) {
        console.error('Error calling DeepSeek API:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate itinerary',
            error: error.message
        });
    }
});

// Save customized itinerary
router.post('/save-itinerary', async (req, res) => {
    try {
        const { 
            name, 
            email, 
            travelers, 
            travelDate, 
            itinerary 
        } = req.body;

        // Validate required fields
        if (!name || !email || !itinerary) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and itinerary are required'
            });
        }
        
        // Extract key information from the itinerary
        const destinations = [];
        if (itinerary.days && Array.isArray(itinerary.days)) {
            // Get unique locations
            itinerary.days.forEach(day => {
                if (day.location && !destinations.includes(day.location)) {
                    destinations.push(day.location);
                }
            });
        }
        
        // Extract activities
        const activities = [];
        if (itinerary.days && Array.isArray(itinerary.days)) {
            itinerary.days.forEach(day => {
                if (day.activities && Array.isArray(day.activities)) {
                    day.activities.forEach(activity => {
                        if (!activities.includes(activity)) {
                            activities.push(activity);
                        }
                    });
                }
            });
        }

        // Create new booking in database with AI itinerary
        const booking = new Booking({
            name,
            email,
            tourType: 'ai_customized',
            travelDate: travelDate ? new Date(travelDate) : null,
            source: 'custom_tour_builder',
            status: 'new',
            customTour: {
                destinations,
                activities,
                travelerCount: parseInt(travelers) || 2,
                duration: itinerary.days ? itinerary.days.length.toString() : '7-10 days',
                budget: 'medium',
                accommodationPreference: 'mid-range',
                additionalNotes: itinerary.summary || ''
            },
            aiItinerary: JSON.stringify(itinerary)
        });
        
        await booking.save();
        
        // Attempt to send notification email to admin
        try {
            const transporter = nodemailer.createTransport({
                service: process.env.EMAIL_SERVICE,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                },
                tls: {
                    rejectUnauthorized: false
                }
            });
            
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
                subject: 'New AI-Customized Itinerary Booking',
                html: `
                    <h2>New AI-Customized Itinerary Booking</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Travel Date:</strong> ${travelDate || 'Not specified'}</p>
                    <p><strong>Number of Travelers:</strong> ${travelers || '2'}</p>
                    <p><strong>Destinations:</strong> ${destinations.join(', ')}</p>
                    <p><strong>Itinerary Summary:</strong> ${itinerary.summary || 'No summary provided'}</p>
                    <p><a href="${process.env.SITE_URL}/admin/bookings/${booking._id}">View in Admin Panel</a></p>
                `
            });
            
            // Send confirmation to customer
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Your Customized Morocco Itinerary',
                html: `
                    <h2>Thank You for Your Booking!</h2>
                    <p>Dear ${name},</p>
                    <p>We're excited to confirm that we've received your customized itinerary request for Morocco. Our team will review your AI-generated plan and reach out within 24 hours to finalize the details.</p>
                    <p><strong>Itinerary Summary:</strong> ${itinerary.summary || 'Your personalized Moroccan journey'}</p>
                    <p><strong>Travel Date:</strong> ${travelDate || 'To be confirmed'}</p>
                    <p><strong>Destinations:</strong> ${destinations.join(', ')}</p>
                    <p>If you have any questions in the meantime, please don't hesitate to contact us.</p>
                    <p>Best regards,<br>The Morocco Travel Experts Team</p>
                `
            });
        } catch (emailError) {
            console.error('Error sending email notification:', emailError);
            // Don't fail the API response if email fails
        }
        
        return res.json({
            success: true,
            message: 'Your customized itinerary has been saved! We will contact you shortly.',
            bookingId: booking._id
        });
    } catch (error) {
        console.error('Error saving itinerary:', error);
        return res.status(500).json({
            success: false,
            message: 'Error processing your request',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Export router
module.exports = router; 