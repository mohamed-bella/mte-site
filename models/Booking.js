const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    // Basic booking information
    tour: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tour',
        required: false // Make it optional to allow custom tour bookings
    },
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
        enum: ['website', 'custom_tour_builder', 'admin', 'referral', 'social', 'other', 'ai_itinerary_generator'],
        default: 'website'
    },
    status: {
        type: String,
        enum: ['new', 'pending_payment', 'paid', 'contacted', 'confirmed', 'canceled', 'completed'],
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
    
    // Pricing information
    pricing: {
        basePrice: {
            type: Number,
            default: 0
        },
        discount: {
            type: Number,
            default: 0
        },
        finalPrice: {
            type: Number,
            default: 0
        }
    },
    
    // AI-generated itinerary (stored as JSON string)
    aiItinerary: {
        type: String,
        trim: true
    },
    
    // Payment information
    payment: {
        status: {
            type: String,
            enum: ['not_paid', 'pending', 'completed', 'failed'],
            default: 'not_paid'
        },
        method: {
            type: String,
            enum: ['paypal', 'bank_transfer', 'cash', 'other'],
            default: 'paypal'
        },
        transactionId: {
            type: String,
            trim: true
        },
        paymentDate: {
            type: Date
        },
        confirmationCode: {
            type: String,
            trim: true
        }
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