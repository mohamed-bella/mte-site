const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    siteTitle: {
        type: String,
        required: true,
        default: 'Morocco Travel Experts'
    },
    email: {
        type: String,
        required: true,
        default: 'contact@moroccotravelexperts.com'
    },
    phone: {
        type: String,
        required: true,
        default: '+212612210183'
    },

    socialMedia: {
        facebook: {
            type: String,
            default: ''
        },
        instagram: {
            type: String,
            default: ''
        },
        twitter: {
            type: String,
            default: ''
        }
    },
    metaTitle: {
        type: String,
        default: 'Morocco Travel Experts - Your Gateway to Authentic Moroccan Experiences'
    },
    metaDescription: {
        type: String,
        default: 'Discover the magic of Morocco with our curated tours and authentic experiences'
    },
    metaKeywords: {
        type: String,
        default: 'morocco tours, moroccan travel, desert tours, cultural experiences'
    },  
    smtp: {
        host: {
            type: String,
            default: ''
        },
        port: {
            type: Number,
            default: 587
        },
        username: {
            type: String,
            default: ''
        },
        password: {
            type: String,
            default: ''
        }
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure only one settings document exists
settingSchema.pre('save', async function(next) {
    const Setting = this.constructor;
    if (this.isNew) {
        const count = await Setting.countDocuments();
        if (count > 0) {
            const err = new Error('Only one settings document can exist');
            next(err);
        }
    }
    next();
});

module.exports = mongoose.model('Setting', settingSchema);
