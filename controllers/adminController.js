// // controllers/adminController.js
// const Tour = require('../models/Tour');
// const Booking = require('../models/Booking');
const CustomTourRequest = require('../models/CustomTourRequest');
// const slugify = require('slugify');
const Blog = require('../models/Blog');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary (in case it's needed directly in the controller)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Tour Management
exports.getDashboard = async (req, res) => {
     try {
          const [tourCount, bookingCount, pendingBookings, customRequestsCount] = await Promise.all([
               Tour.countDocuments() || 0,
               Booking.countDocuments() || 0,
               Booking.countDocuments({ status: 'pending' }) || 0,
               CustomTourRequest.countDocuments() || 0
          ]);

          res.render('admin/dashboard', {
               title: 'Admin Dashboard',
               path: '/admin/dashboard',
               stats: {
                    tourCount,
                    bookingCount,
                    pendingBookings,
                    customRequestsCount
               }
          });
     } catch (error) {
          req.flash('error', 'Error loading dashboard');
          res.redirect('/admin');
     }
};

// exports.getAllTours = async (req, res) => {
//      try {
//           const tours = await Tour.find().sort('-createdAt');
//           res.render('admin/tours', {
//                title: 'Manage Tours',
//                tours
//           });
//      } catch (error) {
//           req.flash('error', 'Error loading tours');
//           res.redirect('/admin/dashboard');
//      }
// };

// exports.getCreateTourForm = (req, res) => {
//      res.render('admin/new-tour', {
//           title: 'Create New Tour'
//      });
// };

// exports.getTourById = async (req, res) => {
//      try {
//           const tour = await Tour.findById(req.params.id);
//           if (!tour) {
//                req.flash('error', 'Tour not found');
//                return res.redirect('/admin/tours');
//           }
//           res.render('admin/edit-tour', {
//                title: 'Edit Tour',
//                tour
//           });
//      } catch (error) {
//           req.flash('error', 'Error loading tour');
//           res.redirect('/admin/tours');
//      }
// };

// exports.createTour = async (req, res) => {
//      try {
//           // Extract tour data from request body
//           const {
//                title,
//                description,
//                price,
//                duration,
//                groupSize,
//                startLocation,
//                accommodation,
//                mainImage,
//                images,
//                itinerary
//           } = req.body;

//           // Create tour object
//           const tourData = {
//                title,
//                description,
//                price,
//                duration,
//                groupSize,
//                startLocation,
//                accommodation,
//                mainImage,
//                images: Array.isArray(images) ? images.filter(url => url.trim() !== '') : [],
//                slug: slugify(title, { lower: true }),
//                itinerary: Array.isArray(itinerary) ? itinerary : JSON.parse(itinerary)
//           };

//           // Create new tour
//           const newTour = await Tour.create(tourData);

//           req.flash('success', 'Tour created successfully');
//           res.redirect(`/admin/tours/${newTour._id}`);
//      } catch (error) {
//           console.error('Tour creation error:', error);
//           req.flash('error', error.message || 'Error creating tour');
//           res.redirect('/admin/tours/new');
//      }
// };

// exports.updateTour = async (req, res) => {
//      try {
//           const tourId = req.params.id;
//           const {
//                title,
//                description,
//                price,
//                duration,
//                groupSize,
//                startLocation,
//                accommodation,
//                mainImage,
//                images,
//                itinerary
//           } = req.body;

//           // Prepare update data
//           const updateData = {
//                title,
//                description,
//                price,
//                duration,
//                groupSize,
//                startLocation,
//                accommodation,
//                mainImage,
//                images: Array.isArray(images) ? images.filter(url => url.trim() !== '') : [],
//                slug: slugify(title, { lower: true }),
//                itinerary: Array.isArray(itinerary) ? itinerary : JSON.parse(itinerary),
//                updatedAt: Date.now()
//           };

//           // Update tour
//           const updatedTour = await Tour.findByIdAndUpdate(tourId, updateData, {
//                new: true,
//                runValidators: true
//           });

//           if (!updatedTour) {
//                req.flash('error', 'Tour not found');
//                return res.redirect('/admin/tours');
//           }

//           req.flash('success', 'Tour updated successfully');
//           res.redirect(`/admin/tours/${tourId}`);
//      } catch (error) {
//           console.error('Tour update error:', error);
//           req.flash('error', error.message || 'Error updating tour');
//           res.redirect(`/admin/tours/${req.params.id}/edit`);
//      }
// };

// exports.deleteTour = async (req, res) => {
//      try {
//           const tour = await Tour.findByIdAndDelete(req.params.id);

//           if (!tour) {
//                req.flash('error', 'Tour not found');
//                return res.redirect('/admin/tours');
//           }

//           req.flash('success', 'Tour deleted successfully');
//           res.redirect('/admin/tours');
//      } catch (error) {
//           req.flash('error', 'Error deleting tour');
//           res.redirect('/admin/tours');
//      }
// };

// exports.toggleTourFeatured = async (req, res) => {
//      try {
//           const tour = await Tour.findById(req.params.id);
//           if (!tour) {
//                req.flash('error', 'Tour not found');
//                return res.redirect('/admin/tours');
//           }

//           tour.isFeatured = !tour.isFeatured;
//           await tour.save();

//           req.flash('success', 'Tour featured status updated successfully');
//           res.redirect('/admin/tours');
//      } catch (error) {
//           req.flash('error', 'Error toggling featured status');
//           res.redirect('/admin/tours');
//      }
// };

// // Booking Management
// exports.getAllBookings = async (req, res) => {
//      try {
//           const bookings = await Booking.find()
//                .populate('tour', 'title price')
//                .sort('-createdAt');

//           res.render('admin/bookings', {
//                title: 'Manage Bookings',
//                bookings
//           });
//      } catch (error) {
//           req.flash('error', 'Error loading bookings');
//           res.redirect('/admin/dashboard');
//      }
// };

// exports.getBookingDetails = async (req, res) => {
//      try {
//           const booking = await Booking.findById(req.params.id)
//                .populate('tour', 'title price duration startLocation');

//           if (!booking) {
//                req.flash('error', 'Booking not found');
//                return res.redirect('/admin/bookings');
//           }

//           res.render('admin/booking-details', {
//                title: 'Booking Details',
//                booking
//           });
//      } catch (error) {
//           req.flash('error', 'Error loading booking details');
//           res.redirect('/admin/bookings');
//      }
// };

// exports.updateBookingStatus = async (req, res) => {
//      try {
//           const { status } = req.body;
//           const booking = await Booking.findByIdAndUpdate(
//                req.params.id,
//                { status },
//                { new: true }
//           );

//           if (!booking) {
//                req.flash('error', 'Booking not found');
//                return res.redirect('/admin/bookings');
//           }

//           req.flash('success', 'Booking status updated successfully');
//           res.redirect('/admin/bookings');
//      } catch (error) {
//           req.flash('error', 'Error updating booking status');
//           res.redirect('/admin/bookings');
//      }
// };

// exports.deleteBooking = async (req, res) => {
//      try {
//           const booking = await Booking.findByIdAndDelete(req.params.id);

//           if (!booking) {
//                req.flash('error', 'Booking not found');
//                return res.redirect('/admin/bookings');
//           }

//           req.flash('success', 'Booking deleted successfully');
//           res.redirect('/admin/bookings');
//      } catch (error) {
//           req.flash('error', 'Error deleting booking');
//           res.redirect('/admin/bookings');
//      }
// };

// // Export settings if needed
// exports.getSettings = (req, res) => {
//      res.render('admin/settings', {
//           title: 'Admin Settings'
//      });
// };

// Custom Tour Requests Management
exports.getAllCustomRequests = async (req, res) => {
     try {
          const customRequests = await CustomTourRequest.find()
               .populate('baseTour', 'title')
               .sort('-createdAt');

          res.render('admin/custom-requests', {
               title: 'Custom Tour Requests',
               customRequests
          });
     } catch (error) {
          req.flash('error', 'Error loading custom tour requests');
          res.redirect('/admin/dashboard');
     }
};

exports.getCustomRequestDetails = async (req, res) => {
     try {
          const customRequest = await CustomTourRequest.findById(req.params.id)
               .populate('baseTour', 'title price duration startLocation');

          if (!customRequest) {
               req.flash('error', 'Custom tour request not found');
               return res.redirect('/admin/custom-requests');
          }

          res.render('admin/custom-request-details', {
               title: 'Custom Request Details',
               customRequest
          });
     } catch (error) {
          req.flash('error', 'Error loading custom request details');
          res.redirect('/admin/custom-requests');
     }
};

exports.updateCustomRequestStatus = async (req, res) => {
     try {
          const { status } = req.body;
          const customRequest = await CustomTourRequest.findByIdAndUpdate(
               req.params.id,
               { 
                    status,
                    updatedAt: Date.now() 
               },
               { new: true }
          );

          if (!customRequest) {
               req.flash('error', 'Custom tour request not found');
               return res.redirect('/admin/custom-requests');
          }

          req.flash('success', 'Custom tour request status updated successfully');
          res.redirect('/admin/custom-requests');
     } catch (error) {
          req.flash('error', 'Error updating custom request status');
          res.redirect('/admin/custom-requests');
     }
};

// Blog Management Functions
exports.getAllBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        
        res.render('admin/blogs', {
            title: 'Manage Blog Posts',
            blogs,
            path: '/admin/blogs'
        });
    } catch (error) {
        console.error('Error fetching blogs:', error);
        req.flash('error', 'Failed to fetch blog posts');
        res.redirect('/admin/dashboard');
    }
};

exports.getNewBlogForm = (req, res) => {
    res.render('admin/blog-form', {
        title: 'Create New Blog Post',
        blog: null,
        path: '/admin/blogs'
    });
};

exports.createBlog = async (req, res) => {
    try {
        const {
            title,
            content,
            summary,
            metaTitle,
            metaDescription,
            metaKeywords,
            category,
            tags,
            author,
            status,
            featuredImageUrl,  // Hidden field for the featured image URL if already uploaded via AJAX
        } = req.body;

        console.log('Received blog data:', { title, summary, category, status });

        // Process featured image
        let finalFeaturedImageUrl = featuredImageUrl;
        if (req.files && req.files.featuredImage && req.files.featuredImage[0]) {
            finalFeaturedImageUrl = await uploadToCloudinary(req.files.featuredImage[0]);
        }

        // Process additional images
        let imageUrls = [];
        if (req.body.additionalImages && Array.isArray(req.body.additionalImages)) {
            // If images were already uploaded via AJAX and URLs are passed in the form
            imageUrls = req.body.additionalImages;
        } else if (req.files && req.files.images) {
            // If images are uploaded directly with the form
            for (const file of req.files.images) {
                const imageUrl = await uploadToCloudinary(file);
                imageUrls.push(imageUrl);
            }
        }

        // Process tags (convert comma-separated string to array)
        const tagArray = tags ? tags.split(',').map(tag => tag.trim()) : [];

        // Create new blog post
        const newBlog = new Blog({
            title,
            content, // This will now contain the HTML from Quill editor
            summary,
            featuredImage: finalFeaturedImageUrl,
            images: imageUrls,
            metaTitle: metaTitle || title,
            metaDescription: metaDescription || summary,
            metaKeywords,
            category,
            tags: tagArray,
            author: author || 'Morocco Travel Experts',
            status: status || 'draft',
            isPublished: status === 'published',
            publishedAt: status === 'published' ? Date.now() : null
        });

        await newBlog.save();

        res.json({
            success: true,
            message: 'Blog post created successfully',
            blog: newBlog
        });
    } catch (error) {
        console.error('Error creating blog post:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error creating blog post'
        });
    }
};

exports.getBlogEditForm = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            req.flash('error', 'Blog post not found');
            return res.redirect('/admin/blogs');
        }
        
        res.render('admin/blog-form', {
            title: 'Edit Blog Post',
            blog,
            path: '/admin/blogs'
        });
    } catch (error) {
        console.error('Error fetching blog for edit:', error);
        req.flash('error', 'Failed to fetch blog post');
        res.redirect('/admin/blogs');
    }
};

exports.updateBlog = async (req, res) => {
    try {
        const {
            title,
            content,
            summary,
            metaTitle,
            metaDescription,
            metaKeywords,
            category,
            tags,
            author,
            status,
            featuredImageUrl // Hidden field for the featured image URL if already uploaded via AJAX
        } = req.body;

        console.log('Updating blog data:', { title, summary, category, status });

        // Find existing blog
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }

        // Process featured image if new one provided
        let finalFeaturedImageUrl = featuredImageUrl || blog.featuredImage;
        if (req.files && req.files.featuredImage && req.files.featuredImage[0]) {
            finalFeaturedImageUrl = await uploadToCloudinary(req.files.featuredImage[0]);
        }

        // Process additional images
        let imageUrls = blog.images || [];
        if (req.body.additionalImages && Array.isArray(req.body.additionalImages)) {
            // If images were already uploaded via AJAX and URLs are passed in the form
            imageUrls = req.body.additionalImages;
        } else if (req.files && req.files.images) {
            // If images are uploaded directly with the form
            imageUrls = []; // Clear existing images if new ones are provided
            for (const file of req.files.images) {
                const imageUrl = await uploadToCloudinary(file);
                imageUrls.push(imageUrl);
            }
        }

        // Process tags
        const tagArray = tags ? tags.split(',').map(tag => tag.trim()) : [];

        // Update blog properties
        blog.title = title;
        blog.content = content; // This will now contain the HTML from Quill editor
        blog.summary = summary;
        blog.featuredImage = finalFeaturedImageUrl;
        blog.images = imageUrls;
        blog.metaTitle = metaTitle || title;
        blog.metaDescription = metaDescription || summary;
        blog.metaKeywords = metaKeywords;
        blog.category = category;
        blog.tags = tagArray;
        blog.author = author || 'Morocco Travel Experts';
        blog.status = status || 'draft';
        
        // Handle publishing status change
        const wasPublished = blog.isPublished;
        blog.isPublished = status === 'published';
        
        // Set publishedAt date if being published for the first time
        if (!wasPublished && blog.isPublished) {
            blog.publishedAt = Date.now();
        }
        
        // Update lastModified
        blog.lastModified = Date.now();

        await blog.save();

        res.json({
            success: true,
            message: 'Blog post updated successfully',
            blog
        });
    } catch (error) {
        console.error('Error updating blog post:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error updating blog post'
        });
    }
};

exports.deleteBlog = async (req, res) => {
    try {
        const result = await Blog.findByIdAndDelete(req.params.id);
        
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Blog post deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting blog post:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error deleting blog post'
        });
    }
};

// Helper function to upload to Cloudinary (duplicated from adminRoutes.js for use within controller)
async function uploadToCloudinary(file) {
    try {
        // Convert buffer to base64
        const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        
        // Generate a unique filename
        const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '-')}`;
        
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(base64Image, {
            public_id: `blog_images/${fileName}`,
            folder: 'morocco-travel-experts',
            resource_type: 'image'
        });
        
        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary Upload Error:', error);
        throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
    }
}

// module.exports = exports;