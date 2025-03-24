const mongoose = require('mongoose');

/**
 * ExcursionReservation Schema
 * Stores both formal reservations and general inquiries
 */
const excursionReservationSchema = new mongoose.Schema({
    // Only filled for reservations, null for general inquiries
    excursion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Excursion',
        required: false
    },
    excursionTitle: {
        type: String,
        required: false
    },
    // Contact information - required for all
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
        required: false,
        trim: true
    },
    // Reservation details - only for specific reservations
    date: {
        type: Date,
        required: false
    },
    participants: {
        type: Number,
        default: 0
    },
    // Message content - for both reservations and inquiries
    message: {
        type: String,
        trim: true,
        default: ''
    },
    // Status tracking
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'canceled', 'completed', 'inquiry'],
        default: 'pending'
    },
    // Track whether the reservation has been read by admin
    read: {
        type: Boolean,
        default: false
    },
    // Auto timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
excursionReservationSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('ExcursionReservation', excursionReservationSchema); 