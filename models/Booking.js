const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    // Tour information
    tour: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tour',
        required: false // Make it optional to allow direct bookings
    },
    tourName: {
        type: String,
        trim: true
    },
    
    // Customer information
    customerInfo: {
        firstName: {
            type: String,
            required: true,
            trim: true
        },
        lastName: {
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
            required: true,
            trim: true
        }
    },
    
    // Booking details
    bookingDetails: {
        startDate: {
            type: Date,
            required: true
        },
        groupSize: {
            type: Number,
            required: true,
            min: 1
        },
        specialRequests: {
            type: String,
            trim: true
        }
    },
    
    // Status information
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
        default: 'pending'
    },
    
    // Tracking information
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