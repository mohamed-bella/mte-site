const mongoose = require('mongoose');

const customTourRequestSchema = new mongoose.Schema({
    // Basic user info
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
    
    // Tour reference (if based on existing tour)
    baseTour: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tour'
    },
    baseTourName: {
        type: String
    },
    
    // Customization details
    customizations: {
        type: [String],
        default: []
    },
    message: {
        type: String,
        trim: true
    },
    travelDate: {
        type: Date
    },
    budget: {
        type: String,
        trim: true
    },
    
    // Status tracking
    status: {
        type: String,
        enum: ['new', 'contacted', 'in-progress', 'finalized', 'cancelled'],
        default: 'new'
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date
    }
});

const CustomTourRequest = mongoose.model('CustomTourRequest', customTourRequestSchema);

module.exports = CustomTourRequest; 