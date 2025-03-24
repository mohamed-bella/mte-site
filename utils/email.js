/**
 * Email Utilities
 * Functions for sending various email notifications
 */

const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

// Whether to disable email sending (useful for development/testing)
const DISABLE_EMAILS = false;

// Configure SendGrid if API key is available
if (process.env.EMAIL_API === 'sendgrid' && process.env.EMAIL_API_KEY) {
    sgMail.setApiKey(process.env.EMAIL_API_KEY);
}

/**
 * Creates a nodemailer transporter for SMTP email sending
 * @returns {object} Nodemailer transporter
 */
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || 465),
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            // Do not fail on invalid certs
            rejectUnauthorized: false
        }
    });
};

/**
 * Sends an email
 * @param {object} options Email options
 * @returns {Promise<object>} Send result
 */
exports.sendEmail = async (options) => {
    if (DISABLE_EMAILS) {
        console.log('Email sending disabled. Would have sent:', options.subject);
        return { success: true, disabled: true };
    }

    // Log email configuration for debugging
    console.log('===== EMAIL DEBUG INFO =====');
    console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
    console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
    console.log('EMAIL_SECURE:', process.env.EMAIL_SECURE);
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS exists:', !!process.env.EMAIL_PASS);
    console.log('EMAIL_API:', process.env.EMAIL_API);
    console.log('SendGrid API Key exists:', !!process.env.EMAIL_API_KEY);
    console.log('Recipient:', options.to);
    console.log('Subject:', options.subject);
    console.log('===== END DEBUG INFO =====');

    try {
        // Check if SendGrid is configured and should be used
        if (process.env.EMAIL_API === 'sendgrid' && process.env.EMAIL_API_KEY) {
            console.log('[Email] Sending via SendGrid API');
            
            const msg = {
                to: options.to,
                from: {
                    email: process.env.SENDER_EMAIL || process.env.EMAIL_USER,
                    name: options.fromName || 'Morocco Travel Experts'
                },
                subject: options.subject,
                html: options.html,
                text: options.text
            };
            
            console.log('[Email] SendGrid message:', JSON.stringify({
                to: msg.to,
                from: msg.from,
                subject: msg.subject
            }));
            
            const result = await sgMail.send(msg);
            console.log(`[Email] Sent successfully to ${options.to} via SendGrid`);
            return { success: true, result };
        }
        
        // Fall back to SMTP/Nodemailer
        console.log('[Email] Sending via SMTP (Nodemailer)');
        const transporter = createTransporter();
        console.log('[Email] Created transporter with config:', {
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT || 465),
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS ? '****' : 'NOT SET'
            }
        });
        
        const mailOptions = {
            from: `${options.fromName || 'Morocco Travel Experts'} <${process.env.EMAIL_USER}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text
        };
        
        console.log('[Email] Sending mail with options:', JSON.stringify({
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject
        }));
        
        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email] Sent successfully to ${options.to} via SMTP:`, info.messageId);
        return { success: true, info };
    } catch (error) {
        console.error('[Email] Send error:', error);
        console.error('[Email] Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code,
            command: error.command,
            responseCode: error.responseCode,
            response: error.response
        });
        return { success: false, error };
    }
};

/**
 * Sends a notification when a tour has been successfully generated
 * @param {object} data Tour and recipient data
 * @returns {Promise<object>} Send result
 */
exports.sendTourGeneratedEmail = async (data) => {
    const { email, name, itinerary, bookingId } = data;
    
    if (!email || !itinerary) {
        console.error('[Email] Missing required data for tour generation email');
        return { success: false, error: 'Missing required data' };
    }
    
    // Extract key information from the itinerary
    const destinations = [];
    const activities = [];
    let duration = '7';
    
    if (itinerary.days && Array.isArray(itinerary.days)) {
        // Get unique locations and duration
        duration = itinerary.days.length.toString();
        itinerary.days.forEach(day => {
            if (day.location && !destinations.includes(day.location)) {
                destinations.push(day.location);
            }
            
            // Extract activities
            if (day.activities && Array.isArray(day.activities)) {
                day.activities.forEach(activity => {
                    if (!activities.includes(activity)) {
                        activities.push(activity);
                    }
                });
            }
        });
    }
    
    // Format first 3 days as preview
    let daysPreview = '';
    if (itinerary.days && Array.isArray(itinerary.days)) {
        const previewDays = itinerary.days.slice(0, 3);
        previewDays.forEach(day => {
            daysPreview += `
                <div style="margin-bottom: 15px; padding: 15px; background-color: #fff4e6; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: #dd6b20;">Day ${day.day}: ${day.location}</h3>
                    <p>${day.description}</p>
                    ${day.activities && day.activities.length > 0 ? 
                        `<p><strong>Activities:</strong> ${day.activities.slice(0, 3).join(', ')}${day.activities.length > 3 ? '...' : ''}</p>` : ''}
                </div>
            `;
        });
    }
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #ed8936; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0;">Your Morocco Itinerary is Ready!</h1>
            </div>
            
            <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; background-color: #f7fafc;">
                <p>Dear ${name || 'Traveler'},</p>
                
                <p>Great news! Your personalized Morocco itinerary has been successfully generated. Here's a preview of your ${duration}-day adventure:</p>
                
                <div style="margin: 25px 0; padding: 15px; background-color: #fffaf0; border-left: 4px solid #ed8936; border-radius: 4px;">
                    <h2 style="margin-top: 0; color: #dd6b20;">${itinerary.title || 'Your Personalized Morocco Adventure'}</h2>
                    <p><strong>Duration:</strong> ${duration} days</p>
                    <p><strong>Destinations:</strong> ${destinations.join(', ')}</p>
                    <p><strong>Summary:</strong> ${itinerary.summary || 'Your custom Moroccan journey'}</p>
                </div>
                
                <h3 style="color: #2d3748;">Itinerary Preview:</h3>
                ${daysPreview}
                
                <p style="margin-top: 25px;">To view your complete itinerary and book your tour, please visit our website or contact us directly.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.SITE_URL}/tour/${bookingId}" style="background-color: #ed8936; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">View Full Itinerary</a>
                </div>
                
                <p>If you have any questions or would like to make adjustments to your itinerary, please don't hesitate to contact us.</p>
                
                <p>Thank you for choosing Morocco Travel Experts for your adventure!</p>
                
                <p>Best regards,<br>The Morocco Travel Experts Team</p>
            </div>
            
            <div style="text-align: center; padding: 15px; color: #718096; font-size: 12px;">
                <p>© ${new Date().getFullYear()} Morocco Travel Experts. All rights reserved.</p>
            </div>
        </div>
    `;
    
    const text = `
Your Morocco Itinerary is Ready!

Dear ${name || 'Traveler'},

Great news! Your personalized Morocco itinerary has been successfully generated. Here's a preview of your ${duration}-day adventure:

${itinerary.title || 'Your Personalized Morocco Adventure'}
Duration: ${duration} days
Destinations: ${destinations.join(', ')}
Summary: ${itinerary.summary || 'Your custom Moroccan journey'}

To view your complete itinerary and book your tour, please visit: ${process.env.SITE_URL}/tour/${bookingId}

If you have any questions or would like to make adjustments to your itinerary, please don't hesitate to contact us.

Thank you for choosing Morocco Travel Experts for your adventure!

Best regards,
The Morocco Travel Experts Team
    `;
    
    return await exports.sendEmail({
        to: email,
        subject: '🌙 Your Morocco Itinerary is Ready!',
        html,
        text,
        fromName: 'Morocco Travel Experts'
    });
}; 