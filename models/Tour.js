const mongoose = require('mongoose');
const slugify = require('slugify');

const itinerarySchema = new mongoose.Schema({
    day: {
        type: Number,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    distance: String,
    highlights: [String]
});

const tourSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Tour title is required'],
        trim: true
    },
    slug: {
        type: String,
        // required: true,
        unique: true
    },
    description: {
        type: String,
        required: [true, 'Tour description is required']
    },
    duration: {
        type: Number,
        required: [true, 'Tour duration is required'],
        min: 1
    },
    price: {
        type: Number,
        required: [true, 'Tour price is required']
    },
    groupSize: {
        type: Number,
        required: true,
        default: 15
    },
    startLocation: {
        type: String,
        required: [true, 'Starting location is required']
    },
    accommodation: {
        type: String,
        required: true
    },
    mainImage: {
        type: String,
        required: [true, 'Main image URL is required']
    },
    images: [{
        type: String,
        validate: {
            validator: function (url) {
                const urlPattern = new RegExp('^https?:\\/\\/.+\\..+');
                return urlPattern.test(url);
            },
            message: 'Please provide a valid image URL'
        }
    }],
    mapImage: {
        type: String,
        required: [true, 'Tour route map image is required'],
        validate: {
            validator: function (url) {
                const urlPattern = new RegExp('^https?:\\/\\/.+\\..+');
                return urlPattern.test(url);
            },
            message: 'Please provide a valid map image URL'
        }
    },
    featured: {
        type: Boolean,
        default: true
    },
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 4.5
    },
    reviewsCount: {
        type: Number,
        default: 0
    },
    includes: [{
        type: String,
        required: true
    }],
    excludes: [{
        type: String,
        required: true
    }],
    itinerary: [itinerarySchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
tourSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Create slug from title with timestamp for uniqueness
tourSchema.pre('save', function (next) {
    if (!this.isModified('title')) return next();
    const timestamp = Date.now();
    this.slug = slugify(`${this.title}-${timestamp}`, { lower: true });
    next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;