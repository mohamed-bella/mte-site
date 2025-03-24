const Excursion = require('../../models/Excursion');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadPath = path.join('public', 'uploads', 'excursions');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'excursion-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max file size
    }
});

// Middleware to handle file uploads
const uploadFields = upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'images', maxCount: 10 }
]);

// Helper function to delete file if it exists
const deleteFile = (filePath) => {
    // Check if filePath is defined and valid before proceeding
    if (!filePath) {
        console.warn('Attempted to delete file with undefined path');
        return;
    }
    
    const fullPath = path.join(process.cwd(), filePath);
    if (filePath.startsWith('/uploads/') && fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
    }
};

// Display list of all excursions
exports.excursion_list = async (req, res) => {
    try {
        const excursions = await Excursion.find({})
            .sort({ createdAt: -1 });
        
        res.render('admin/excursion/index', { 
            excursions,
            title: 'Excursions Management'
        });
    } catch (err) {
        console.error('Error fetching excursions:', err);
        req.flash('error_msg', 'Error loading excursions');
        res.redirect('/admin/dashboard');
    }
};

// Display detail page for a specific excursion
exports.excursion_detail = async (req, res) => {
    try {
        const excursion = await Excursion.findById(req.params.id);
        
        if (!excursion) {
            req.flash('error_msg', 'Excursion not found');
            return res.redirect('/admin/excursions');
        }
        
        res.render('admin/excursion/view', { 
            excursion,
            title: excursion.title
        });
    } catch (err) {
        console.error('Error fetching excursion details:', err);
        req.flash('error_msg', 'Error loading excursion details');
        res.redirect('/admin/excursions');
    }
};

// Display excursion create form on GET
exports.excursion_create_get = (req, res) => {
    res.render('admin/excursion/form', { 
        title: 'Add New Excursion'
    });
};

// Handle excursion create on POST
exports.excursion_create_post = async (req, res) => {
    try {
        // Handle file uploads first
        uploadFields(req, res, async function(err) {
            if (err instanceof multer.MulterError) {
                console.error('Multer error:', err);
                req.flash('error_msg', `Upload error: ${err.message}`);
                return res.redirect('/admin/excursions/new');
            } else if (err) {
                console.error('Upload error:', err);
                req.flash('error_msg', `Error: ${err.message}`);
                return res.redirect('/admin/excursions/new');
            }
            
            try {
                // Process form data
                const { 
                    title, location, duration, description, 
                    regularPrice, discountPrice, activities,
                    preparationTips, inclusions, exclusions,
                    metaDescription, metaKeywords,
                    itinerary, additionalInfo, minGroupSize, maxGroupSize,
                    meetingPoint, recommendationLevel, additionalFees
                } = req.body;
                
                // Create new excursion object
                const excursionData = {
                    title, 
                    location, 
                    duration, 
                    description,
                    regularPrice: parseFloat(regularPrice),
                    featured: req.body.featured ? true : false,
                    metaDescription: metaDescription || '',
                    metaKeywords: metaKeywords || '',
                    itinerary: itinerary || '',
                    additionalInfo: additionalInfo || '',
                    meetingPoint: meetingPoint || '',
                    additionalFees: additionalFees || '',
                    recommendationLevel: recommendationLevel ? parseInt(recommendationLevel) : 3,
                };
                
                // Handle numeric fields
                if (minGroupSize) {
                    excursionData.minGroupSize = parseInt(minGroupSize);
                }
                
                if (maxGroupSize) {
                    excursionData.maxGroupSize = parseInt(maxGroupSize);
                }
                
                // Add optional discount price if provided
                if (discountPrice) {
                    excursionData.discountPrice = parseFloat(discountPrice);
                }
                
                // Add arrays (make sure they are arrays even if single item)
                excursionData.activities = Array.isArray(activities) ? activities : (activities ? [activities] : []);
                excursionData.preparationTips = Array.isArray(preparationTips) ? preparationTips : (preparationTips ? [preparationTips] : []);
                excursionData.inclusions = Array.isArray(inclusions) ? inclusions : (inclusions ? [inclusions] : []);
                excursionData.exclusions = Array.isArray(exclusions) ? exclusions : (exclusions ? [exclusions] : []);

                // Add main image if uploaded
                if (req.files.mainImage && req.files.mainImage[0]) {
                    excursionData.mainImage = `/uploads/excursions/${req.files.mainImage[0].filename}`;
                }
                
                // Add gallery images if uploaded
                if (req.files.images && req.files.images.length > 0) {
                    excursionData.images = req.files.images.map(file => ({
                        path: `/uploads/excursions/${file.filename}`,
                        description: ''
                    }));
                }
                
                // Create the excursion in the database
                const newExcursion = new Excursion(excursionData);
                await newExcursion.save();
                
                req.flash('success_msg', 'Excursion created successfully');
                res.redirect(`/admin/excursions/${newExcursion._id}`);
            } catch (error) {
                console.error('Error creating excursion:', error);
                req.flash('error_msg', `Error creating excursion: ${error.message}`);
                res.redirect('/admin/excursions/new');
            }
        });
    } catch (err) {
        console.error('Server error:', err);
        req.flash('error_msg', 'Server error occurred');
        res.redirect('/admin/excursions/new');
    }
};

// Display excursion update form on GET
exports.excursion_update_get = async (req, res) => {
    try {
        const excursion = await Excursion.findById(req.params.id);
        
        if (!excursion) {
            req.flash('error_msg', 'Excursion not found');
            return res.redirect('/admin/excursions');
        }
        
        res.render('admin/excursion/form', { 
            excursion,
            title: `Edit ${excursion.title}`
        });
    } catch (err) {
        console.error('Error fetching excursion for edit:', err);
        req.flash('error_msg', 'Error loading excursion data');
        res.redirect('/admin/excursions');
    }
};

// Handle excursion update on POST
exports.excursion_update_post = async (req, res) => {
    try {
        // Get existing excursion to compare changes
        const existingExcursion = await Excursion.findById(req.params.id);
        
        if (!existingExcursion) {
            req.flash('error_msg', 'Excursion not found');
            return res.redirect('/admin/excursions');
        }
        
        // Handle file uploads
        uploadFields(req, res, async function(err) {
            if (err instanceof multer.MulterError) {
                console.error('Multer error:', err);
                req.flash('error_msg', `Upload error: ${err.message}`);
                return res.redirect(`/admin/excursions/${req.params.id}/edit`);
            } else if (err) {
                console.error('Upload error:', err);
                req.flash('error_msg', `Error: ${err.message}`);
                return res.redirect(`/admin/excursions/${req.params.id}/edit`);
            }
            
            try {
                // Process form data
                const { 
                    title, location, duration, description, 
                    regularPrice, discountPrice, activities,
                    preparationTips, inclusions, exclusions,
                    metaDescription, metaKeywords, existingImages,
                    itinerary, additionalInfo, minGroupSize, maxGroupSize,
                    meetingPoint, recommendationLevel, additionalFees
                } = req.body;
                
                // Create update object
                const updateData = {
                    title, 
                    location, 
                    duration, 
                    description,
                    regularPrice: parseFloat(regularPrice),
                    featured: req.body.featured ? true : false,
                    metaDescription: metaDescription || '',
                    metaKeywords: metaKeywords || '',
                    itinerary: itinerary || '',
                    additionalInfo: additionalInfo || '',
                    meetingPoint: meetingPoint || '',
                    additionalFees: additionalFees || '',
                    recommendationLevel: recommendationLevel ? parseInt(recommendationLevel) : 3,
                };
                
                // Handle numeric fields
                if (minGroupSize) {
                    updateData.minGroupSize = parseInt(minGroupSize);
                }
                
                if (maxGroupSize) {
                    updateData.maxGroupSize = parseInt(maxGroupSize);
                }
                
                // Add optional discount price if provided
                if (discountPrice) {
                    updateData.discountPrice = parseFloat(discountPrice);
                } else {
                    // If discount price was removed, use $unset in MongoDB
                    updateData.discountPrice = undefined;
                }
                
                // Add arrays (make sure they are arrays even if single item)
                updateData.activities = Array.isArray(activities) ? activities : (activities ? [activities] : []);
                updateData.preparationTips = Array.isArray(preparationTips) ? preparationTips : (preparationTips ? [preparationTips] : []);
                updateData.inclusions = Array.isArray(inclusions) ? inclusions : (inclusions ? [inclusions] : []);
                updateData.exclusions = Array.isArray(exclusions) ? exclusions : (exclusions ? [exclusions] : []);

                // Handle main image update
                if (req.files.mainImage && req.files.mainImage[0]) {
                    // Delete old image if not default
                    if (existingExcursion.mainImage && existingExcursion.mainImage !== '/images/default-excursion.jpg') {
                        deleteFile(existingExcursion.mainImage);
                    }
                    
                    // Set new image
                    updateData.mainImage = `/uploads/excursions/${req.files.mainImage[0].filename}`;
                }
                
                // Handle gallery images
                let currentImages = [];
                
                // Parse existing images that were kept
                if (existingImages) {
                    try {
                        currentImages = JSON.parse(existingImages);
                    } catch (e) {
                        console.error('Error parsing existing images JSON:', e);
                    }
                }
                
                // Find images that were removed
                const keptImagePaths = currentImages.map(img => img.path);
                const removedImages = existingExcursion.images.filter(img => !keptImagePaths.includes(img.path));
                
                // Delete removed image files
                removedImages.forEach(img => {
                    deleteFile(img.path);
                });
                
                // Add new uploaded images
                if (req.files.images && req.files.images.length > 0) {
                    const newImages = req.files.images.map(file => ({
                        path: `/uploads/excursions/${file.filename}`,
                        description: ''
                    }));
                    
                    // Combine kept and new images
                    updateData.images = [...currentImages, ...newImages];
                } else {
                    // Just use the kept images
                    updateData.images = currentImages;
                }
                
                // Update the excursion in the database
                await Excursion.findByIdAndUpdate(req.params.id, updateData, { new: true });
                
                req.flash('success_msg', 'Excursion updated successfully');
                res.redirect(`/admin/excursions/${req.params.id}`);
            } catch (error) {
                console.error('Error updating excursion:', error);
                req.flash('error_msg', `Error updating excursion: ${error.message}`);
                res.redirect(`/admin/excursions/${req.params.id}/edit`);
            }
        });
    } catch (err) {
        console.error('Server error:', err);
        req.flash('error_msg', 'Server error occurred');
        res.redirect(`/admin/excursions/${req.params.id}/edit`);
    }
};

// Handle excursion delete on POST
exports.excursion_delete_post = async (req, res) => {
    try {
        const excursion = await Excursion.findById(req.params.id);
        
        if (!excursion) {
            req.flash('error_msg', 'Excursion not found');
            return res.redirect('/admin/excursions');
        }
        
        // Delete main image if it exists and is not the default
        if (excursion.mainImage && excursion.mainImage !== '/images/default-excursion.jpg') {
            deleteFile(excursion.mainImage);
        }
        
        // Delete all additional images if they exist
        if (excursion.images && excursion.images.length > 0) {
            excursion.images.forEach(image => {
                if (image && image.path) {
                    deleteFile(image.path);
                }
            });
        }
        
        // Delete from database
        await Excursion.findByIdAndDelete(req.params.id);
        
        req.flash('success_msg', 'Excursion deleted successfully');
        res.redirect('/admin/excursions');
    } catch (err) {
        console.error('Error deleting excursion:', err);
        req.flash('error_msg', `Error deleting excursion: ${err.message}`);
        res.redirect('/admin/excursions');
    }
}; 