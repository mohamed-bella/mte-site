const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const Booking = require('../models/Booking');
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
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        console.log('Sending emails via SMTP (Nodemailer)');
        // Create nodemailer transporter with SSL/TLS options
        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
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
        const { name, email, tour_type, travel_date, source } = req.body;

        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Name and email are required fields'
            });
        }

        // Create new booking inquiry in database
        const newBooking = new Booking({
            name,
            email,
            tourType: tour_type,
            travelDate: travel_date ? new Date(travel_date) : null,
            source: source || 'website',
            status: 'new'
        });

        await newBooking.save();

        // Check if any email method is configured
        const hasEmailConfig = (process.env.EMAIL_API === 'sendgrid' && process.env.EMAIL_API_KEY) || 
                              (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
        
        // Only attempt to send emails if credentials are available
        if (hasEmailConfig) {
            try {
                console.log('Attempting to send booking inquiry emails');
                
                // Email content for admin
                const adminMailOptions = {
                    from: process.env.EMAIL_USER || process.env.SENDER_EMAIL,
                    to: process.env.ADMIN_EMAIL || 'admin@moroccotravelexperts.com',
                    subject: 'New Booking Inquiry',
                    html: `
                        <h2>New Booking Inquiry from Website</h2>
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Tour Type:</strong> ${tour_type}</p>
                        <p><strong>Travel Date:</strong> ${travel_date || 'Not specified'}</p>
                        <p><strong>Source:</strong> ${source || 'Website'}</p>
                        <p>Please respond to this customer within 24 hours.</p>
                    `
                };

                // Email content for customer
                const customerMailOptions = {
                    from: process.env.EMAIL_USER || process.env.SENDER_EMAIL,
                    to: email,
                    subject: 'Thank You for Your Morocco Travel Inquiry',
                    html: `
                        <h2>Thank You for Contacting Morocco Travel Experts</h2>
                        <p>Dear ${name},</p>
                        <p>Thank you for your interest in traveling with us. We have received your inquiry about ${tour_type.replace('_', ' ')} tours.</p>
                        <p>One of our travel specialists will review your request and get back to you within 24 hours with personalized information and options.</p>
                        <p>In the meantime, you can explore more tour options on our website: <a href="https://www.moroccotravelexperts.com/tours">Explore Tours</a></p>
                        <p>Best regards,<br>The Morocco Travel Experts Team</p>
                    `
                };

                // Send emails using the helper function
                await sendEmails(adminMailOptions, customerMailOptions);
                console.log('Booking inquiry emails sent successfully');
            } catch (emailError) {
                // Log email error but don't fail the booking process
                console.error('Error sending booking inquiry emails:', emailError);
                // Update booking to indicate emails failed
                await Booking.findByIdAndUpdate(newBooking._id, {
                    $set: { 
                        notes: 'Inquiry created successfully but confirmation emails failed to send: ' + emailError.message 
                    }
                });
            }
        } else {
            console.warn('Email not configured: Skipping email notifications for booking inquiry');
            await Booking.findByIdAndUpdate(newBooking._id, {
                $set: { 
                    notes: 'Booking inquiry created but email notifications skipped due to missing email configuration' 
                }
            });
        }

        // Return success response even if email sending failed
        return res.json({
            success: true,
            message: 'Booking inquiry received successfully',
            data: {
                booking_id: newBooking._id
            }
        });
    } catch (error) {
        console.error('Booking inquiry error:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while processing your request',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
                              (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
        
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

// Export router
module.exports = router; 