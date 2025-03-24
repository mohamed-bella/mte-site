const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    // Basic booking information
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true
    },
    tourType: {
        type: String,
        required: true,
        default: 'general_inquiry'
    },
    travelDate: {
        type: Date
    },
    source: {
        type: String,
        enum: ['website', 'custom_tour_builder', 'admin', 'referral', 'social', 'other'],
        default: 'website'
    },
    status: {
        type: String,
        enum: ['new', 'contacted', 'confirmed', 'canceled', 'completed'],
        default: 'new'
    },
    notes: {
        type: String,
        trim: true
    },
    
    // Custom tour request details
    customTour: {
        destinations: [{
            type: String,
            trim: true
        }],
        activities: [{
            type: String,
            trim: true
        }],
        travelerCount: {
            type: Number,
            default: 1
        },
        duration: {
            type: String,
            trim: true
        },
        budget: {
            type: String,
            enum: ['economy', 'medium', 'luxury', 'ultra-luxury'],
            default: 'medium'
        },
        accommodationPreference: {
            type: String,
            enum: ['budget', 'mid-range', 'luxury', 'mixed'],
            default: 'mid-range'
        },
        additionalNotes: {
            type: String,
            trim: true
        }
    },
    
    // AI-generated itinerary (stored as JSON string)
    aiItinerary: {
        type: String,
        trim: true
    },
    
    // For tracking and analysis
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field on save
bookingSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Booking', bookingSchema);