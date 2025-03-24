const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const slugify = require('slugify');

const ExcursionSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    duration: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    itinerary: {
        type: String,
        default: ''
    },
    additionalInfo: {
        type: String,
        default: ''
    },
    regularPrice: {
        type: Number,
        required: true,
        min: 0
    },
    discountPrice: {
        type: Number,
        min: 0
    },
    minGroupSize: {
        type: Number,
        min: 1,
        default: 1
    },
    maxGroupSize: {
        type: Number,
        min: 1
    },
    additionalFees: {
        type: String,
        default: ''
    },
    meetingPoint: {
        type: String,
        default: ''
    },
    recommendationLevel: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
    },
    mainImage: {
        type: String,
        default: '/images/default-excursion.jpg'
    },
    images: [{
        path: {
            type: String,
            required: true
        },
        description: {
            type: String,
            default: ''
        }
    }],
    featured: {
        type: Boolean,
        default: false
    },
    activities: {
        type: [String],
        default: []
    },
    preparationTips: {
        type: [String],
        default: []
    },
    inclusions: {
        type: [String],
        default: []
    },
    exclusions: {
        type: [String],
        default: []
    },
    metaDescription: {
        type: String,
        default: ''
    },
    metaKeywords: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Virtual for URL
ExcursionSchema.virtual('url').get(function() {
    return `/excursions/${this._id}`;
});

// Create a text index for search functionality
ExcursionSchema.index({ 
    title: 'text',
    location: 'text', 
    description: 'text'
});

// Create slug from the title
ExcursionSchema.pre('save', function(next) {
    if (!this.slug || this.isModified('title')) {
        console.log(`Creating slug for "${this.title}"`);
        this.slug = slugify(this.title, { 
            lower: true,
            strict: true,
            remove: /[*+~.()'"!:@]/g
        });
        console.log(`Created slug: "${this.slug}"`);
    }
    next();
});

// Virtual populate with reviews
ExcursionSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'excursion',
    localField: '_id'
});

module.exports = mongoose.model('Excursion', ExcursionSchema); 