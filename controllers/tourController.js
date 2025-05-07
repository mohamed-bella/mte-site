const Tour = require('../models/Tour');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

/**
 * Get all tours
 */
exports.getAllTours = async (req, res) => {
    try {
        const tours = await Tour.find().sort({ createdAt: -1 });
        res.render('admin/tours', {
            title: 'Tour Management',
            tours,
            path: '/admin/tours'
        });
    } catch (error) {
        console.error('Error fetching tours:', error);
        req.flash('error', 'Failed to load tours');
        res.status(500).render('admin/tours', {
            title: 'Tour Management',
            tours: [],
            path: '/admin/tours'
        });
    }
};

/**
 * Get tour creation form
 */
exports.getNewTourForm = (req, res) => {
    res.render('admin/tour-form-apple', {
        title: 'Add New Tour',
        tour: null,
        path: '/admin/tours'
    });
};

/**
 * Get tour edit form
 */
exports.getEditTourForm = async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        if (!tour) {
            req.flash('error', 'Tour not found');
            return res.redirect('/admin/tours');
        }
        
        res.render('admin/tour-form-apple', {
            title: 'Edit Tour',
            tour,
            path: '/admin/tours'
        });
    } catch (error) {
        console.error('Error loading tour:', error);
        req.flash('error', 'Error loading tour');
        res.redirect('/admin/tours');
    }
};

/**
 * Create a new tour
 */
exports.createTour = async (req, res) => {
    try {
        const {
            title,
            description,
            price,
            duration,
            groupSize,
            startLocation,
            accommodation,
            itinerary,
            includes,
            excludes,
            featured
        } = req.body;

        // Upload images to Cloudinary
        let imageUrls = [];
        let mapImageUrl = '';

        // Validate required files
        if (!req.files.images || req.files.images.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one tour image is required'
            });
        }

        if (!req.files.mapImage || req.files.mapImage.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'A map image is required'
            });
        }

        // Upload tour images to Cloudinary
        if (req.files.images) {
            try {
                for (const file of req.files.images) {
                    const imageUrl = await uploadToCloudinary(file, 'tours');
                    imageUrls.push(imageUrl);
                }
            } catch (uploadError) {
                console.error('Image upload error:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: `Error uploading tour images: ${uploadError.message}`
                });
            }
        }

        // Upload map image to Cloudinary
        if (req.files.mapImage && req.files.mapImage[0]) {
            try {
                mapImageUrl = await uploadToCloudinary(req.files.mapImage[0], 'tour-maps');
            } catch (uploadError) {
                console.error('Map image upload error:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: `Error uploading map image: ${uploadError.message}`
                });
            }
        }

        // Ensure proper data types for numerical fields
        const parsedPrice = parseFloat(price);
        const parsedDuration = parseInt(duration);
        const parsedGroupSize = parseInt(groupSize);

        // Process the itinerary data - handles both string and array formats
        const parsedItinerary = Array.isArray(itinerary) 
            ? itinerary 
            : (typeof itinerary === 'string' ? JSON.parse(itinerary) : []);

        // Process includes and excludes - handles both string and array formats
        const parsedIncludes = Array.isArray(includes) 
            ? includes 
            : (typeof includes === 'string' ? JSON.parse(includes) : []);

        const parsedExcludes = Array.isArray(excludes)
            ? excludes
            : (typeof excludes === 'string' ? JSON.parse(excludes) : []);

        // Create the new tour
        const newTour = new Tour({
            title,
            description,
            price: parsedPrice,
            duration: parsedDuration,
            groupSize: parsedGroupSize,
            startLocation,
            accommodation,
            mainImage: imageUrls[0] || '',
            images: imageUrls,
            mapImage: mapImageUrl,
            itinerary: parsedItinerary,
            includes: parsedIncludes,
            excludes: parsedExcludes,
            featured: featured === 'on' || featured === true
        });

        await newTour.save();

        res.json({
            success: true,
            message: 'Tour created successfully',
            tour: newTour
        });
    } catch (error) {
        console.error('Tour creation error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error creating tour'
        });
    }
};

/**
 * Update an existing tour
 */
exports.updateTour = async (req, res) => {
    try {
        const {
            title,
            description,
            price,
            duration,
            groupSize,
            startLocation,
            accommodation,
            itinerary,
            includes,
            excludes,
            existingImages,
            featured
        } = req.body;
        
        // Get current tour data
        const currentTour = await Tour.findById(req.params.id);
        if (!currentTour) {
            return res.status(404).json({
                success: false,
                message: 'Tour not found'
            });
        }

        // Initialize with existing images if they're being kept
        let imageUrls = existingImages ? 
            (Array.isArray(existingImages) ? existingImages : [existingImages]) : 
            [];

        // Keep existing map image if no new one is uploaded
        let mapImageUrl = currentTour.mapImage || '';

        // Handle new tour images - upload to Cloudinary
        if (req.files && req.files.images && req.files.images.length > 0) {
            try {
                for (const file of req.files.images) {
                    if (file.size > 0) { // Only process files with content
                        const imageUrl = await uploadToCloudinary(file, 'tours');
                        imageUrls.push(imageUrl);
                    }
                }
                console.log(`Successfully uploaded ${req.files.images.filter(f => f.size > 0).length} new tour images`);
            } catch (uploadError) {
                console.error('Image upload error:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: `Error uploading tour images: ${uploadError.message}`
                });
            }
        }

        // Handle map image - only replace if a new one is uploaded
        if (req.files && req.files.mapImage && req.files.mapImage[0] && req.files.mapImage[0].size > 0) {
            try {
                // Delete the old map image if it exists
                if (currentTour.mapImage) {
                    try {
                        await deleteFromCloudinary(currentTour.mapImage);
                    } catch (deleteError) {
                        console.error('Error deleting old map image:', deleteError);
                    }
                }
                
                mapImageUrl = await uploadToCloudinary(req.files.mapImage[0], 'tour-maps');
                console.log('Successfully uploaded new map image');
            } catch (uploadError) {
                console.error('Map image upload error:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: `Error uploading map image: ${uploadError.message}`
                });
            }
        } else {
            console.log('Keeping existing map image:', mapImageUrl);
        }

        // Ensure proper data types for numerical fields
        const parsedPrice = parseFloat(price);
        const parsedDuration = parseInt(duration);
        const parsedGroupSize = parseInt(groupSize);

        // Process the itinerary data - handles both string and array formats
        const parsedItinerary = Array.isArray(itinerary) 
            ? itinerary 
            : (typeof itinerary === 'string' ? JSON.parse(itinerary) : currentTour.itinerary || []);

        // Process includes and excludes - handles both string and array formats
        const parsedIncludes = Array.isArray(includes) 
            ? includes 
            : (typeof includes === 'string' ? JSON.parse(includes) : currentTour.includes || []);

        const parsedExcludes = Array.isArray(excludes)
            ? excludes
            : (typeof excludes === 'string' ? JSON.parse(excludes) : currentTour.excludes || []);

        // Prepare update object
        const updateData = {
            title,
            description,
            price: parsedPrice,
            duration: parsedDuration,
            groupSize: parsedGroupSize,
            startLocation,
            accommodation,
            itinerary: parsedItinerary,
            includes: parsedIncludes,
            excludes: parsedExcludes,
            featured: featured === 'on' || featured === true
        };

        // Update images only if we have any
        if (imageUrls.length > 0) {
            updateData.images = imageUrls;
            // Set the first image as main image
            updateData.mainImage = imageUrls[0];
        }

        // Only update map image if we have one
        if (mapImageUrl) {
            updateData.mapImage = mapImageUrl;
        }

        console.log('Updating tour with data:', Object.keys(updateData));
        const tour = await Tour.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        console.log('Tour updated successfully');
        res.json({
            success: true,
            message: 'Tour updated successfully',
            tour: tour
        });
    } catch (error) {
        console.error('Tour update error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error updating tour'
        });
    }
};

/**
 * Delete a tour
 */
exports.deleteTour = async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        
        if (!tour) {
            req.flash('error', 'Tour not found');
            return res.redirect('/admin/tours');
        }
        
        // Delete images from Cloudinary
        try {
            // Delete main and additional images
            for (const imageUrl of tour.images) {
                await deleteFromCloudinary(imageUrl);
            }
            
            // Delete map image
            if (tour.mapImage) {
                await deleteFromCloudinary(tour.mapImage);
            }
        } catch (deleteError) {
            console.error('Error deleting images from Cloudinary:', deleteError);
        }
        
        // Delete the tour from database
        await Tour.findByIdAndDelete(req.params.id);
        
        req.flash('success', 'Tour deleted successfully');
        res.redirect('/admin/tours');
    } catch (error) {
        console.error('Tour deletion error:', error);
        req.flash('error', 'Error deleting tour');
        res.redirect('/admin/tours');
    }
};

/**
 * Toggle featured status of a tour
 */
exports.toggleFeatured = async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        
        if (!tour) {
            req.flash('error', 'Tour not found');
            return res.redirect('/admin/tours');
        }
        
        tour.featured = !tour.featured;
        await tour.save();
        
        req.flash('success', `Tour ${tour.featured ? 'featured' : 'unfeatured'} successfully`);
        res.redirect('/admin/tours');
    } catch (error) {
        console.error('Error toggling tour featured status:', error);
        req.flash('error', 'Error updating tour');
        res.redirect('/admin/tours');
    }
};

/**
 * Toggle visibility status of a tour
 */
exports.toggleHidden = async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        
        if (!tour) {
            req.flash('error', 'Tour not found');
            return res.redirect('/admin/tours');
        }
        
        tour.hidden = !tour.hidden;
        await tour.save();
        
        req.flash('success', `Tour ${tour.hidden ? 'hidden from public view' : 'made visible to public'} successfully`);
        res.redirect('/admin/tours');
    } catch (error) {
        console.error('Error toggling tour visibility:', error);
        req.flash('error', 'Error updating tour');
        res.redirect('/admin/tours');
    }
}; 