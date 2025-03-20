const Blog = require('../models/Blog');

/**
 * Get blog listing page with pagination, filtering, and search
 */
exports.getBlogListing = async (req, res) => {
    try {
        // Get query parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;
        const category = req.query.category;
        const tag = req.query.tag;
        const search = req.query.search;
        
        // Build query
        let query = { isPublished: true };
        
        if (category) {
            query.categories = category;
        }
        
        if (tag) {
            query.tags = tag;
        }
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { summary: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Execute query with pagination
        const skip = (page - 1) * limit;
        
        const [blogs, totalCount, categories, tags] = await Promise.all([
            Blog.find(query)
                .sort({ publishedAt: -1 })
                .skip(skip)
                .limit(limit),
            Blog.countDocuments(query),
            Blog.aggregate([
                { $match: { isPublished: true } },
                { $unwind: '$categories' },
                { $group: { _id: '$categories', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            Blog.aggregate([
                { $match: { isPublished: true } },
                { $unwind: '$tags' },
                { $group: { _id: '$tags', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ])
        ]);
        
        // Get recent posts for sidebar
        const recentPosts = await Blog.find({ isPublished: true })
            .sort({ publishedAt: -1 })
            .limit(3)
            .select('title slug featuredImage publishedAt');
            
        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        
        res.render('pages/blog', {
            title: 'Blog | Morocco Travel Experts',
            metaDescription: 'Explore our blog for travel tips, destination guides, and insights about Morocco tours and adventures.',
            currentUrl: '/blog',
            blogs,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages,
                hasNextPage,
                hasPrevPage
            },
            filter: {
                category,
                tag,
                search
            },
            categories,
            tags,
            recentPosts
        });
    } catch (error) {
        console.error('Error fetching blog posts:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load blog posts',
            error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
        });
    }
};

/**
 * Get single blog post page
 */
exports.getSingleBlog = async (req, res, next) => {
    try {
        const blog = await Blog.findOne({ slug: req.params.slug, isPublished: true });
        
        if (!blog) {
            return res.status(404).render('error', {
                title: 'Not Found',
                message: 'The blog post you are looking for does not exist or has been removed.',
                error: { status: 404 }
            });
        }
        
        // Get related posts based on categories and tags
        const relatedPosts = await Blog.find({
            _id: { $ne: blog._id },
            isPublished: true,
            $or: [
                { category: blog.category },
                { tags: { $in: Array.isArray(blog.tags) ? blog.tags : [] } }
            ]
        })
        .sort({ publishedAt: -1 })
        .limit(3);
        
        // Update view count or other analytics here if needed
        
        res.render('pages/blog-single', {
            title: blog.metaTitle || `${blog.title} | Morocco Travel Blog`,
            metaDescription: blog.metaDescription || blog.summary,
            metaKeywords: blog.metaKeywords,
            currentUrl: `/blog/${blog.slug}`,
            blog,
            relatedPosts
        });
    } catch (error) {
        console.error('Error fetching blog post:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load blog post',
            error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
        });
    }
}; 