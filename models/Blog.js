const mongoose = require('mongoose');
const slugify = require('slugify');

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'A blog post must have a title'],
        trim: true,
        maxlength: [150, 'A blog title must be less than 150 characters']
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    content: {
        type: String,
        required: [true, 'A blog post must have content']
    },
    summary: {
        type: String,
        required: [true, 'A blog post must have a summary'],
        trim: true,
        maxlength: [300, 'A blog summary must be less than 300 characters']
    },
    featuredImage: {
        type: String,
        required: [true, 'A blog post must have a featured image']
    },
    images: [String],
    author: {
        type: String,
        default: 'Morocco Travel Experts'
    },
    // SEO fields
    metaTitle: {
        type: String,
        trim: true
    },
    metaDescription: {
        type: String,
        trim: true,
        maxlength: [160, 'Meta description should be less than 160 characters']
    },
    metaKeywords: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        enum: ['travel-tips', 'destinations', 'culture', 'food', 'adventures', 'experiences', 'guides'],
        default: 'travel-tips'
    },
    tags: [String],
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft'
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    publishedAt: {
        type: Date
    },
    lastModified: {
        type: Date,
        default: Date.now
    },
    readTime: {
        type: Number,
        default: 5 // Default read time in minutes
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Generate slug from title before saving
blogSchema.pre('save', function(next) {
    if (this.isModified('title')) {
        this.slug = slugify(this.title, { lower: true, strict: true });
    }
    
    // Calculate estimated read time (approximately 200 words per minute)
    if (this.content) {
        const wordCount = this.content.split(/\s+/).length;
        this.readTime = Math.ceil(wordCount / 200);
    }
    
    // Update lastModified date
    this.lastModified = Date.now();
    
    // Sync isPublished with status
    this.isPublished = this.status === 'published';
    
    // Set publishedAt date if published for the first time
    if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
        this.publishedAt = Date.now();
    }
    
    next();
});

// Virtual for formatted date
blogSchema.virtual('formattedDate').get(function() {
    return this.publishedAt ? this.publishedAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : 'Not published yet';
});

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog; 