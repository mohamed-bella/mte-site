const Excursion = require('../models/Excursion');
const ExcursionReservation = require('../models/ExcursionReservation');
const Reservation = require('../models/Reservation');
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');

// Admin controllers
exports.getAllExcursionsAdmin = async (req, res) => {
    try {
        const excursions = await Excursion.find().sort({ createdAt: -1 });
        console.log(excursions);
        res.render('admin/excursions', {
            excursions,
            currentPage: 'excursions'
        });
    } catch (error) {
        console.error('Error getting excursions:', error);
        req.flash('error', 'Failed to load excursions');
        res.redirect('/admin/dashboard');
    }
};

exports.getAddExcursionForm = (req, res) => {
    res.render('admin/add-excursion', {
        currentPage: 'excursions',
        excursion: {
            title: '',
            description: '',
            location: '',
            mapLink: '',
            startTime: '',
            endTime: '',
            adultPrice: '',
            childPrice: '',
            additionalFees: '',
            minGroupSize: 1,
            inclusions: [],
            exclusions: [],
            activities: [],
            itinerary: '',
            preparationTips: [],
            currency: 'DH',
            featured: false
        }
    });
};

exports.createExcursion = async (req, res) => {
  try {
    console.log('Creating excursion with data:', req.body);
    
    // Process form data
    const {
      title, description, metaDescription, metaKeywords, location, duration, 
      regularPrice, discountPrice, activities, inclusions, exclusions, 
      preparationTips, featured
    } = req.body;

    // Create excursion object
    const excursion = new Excursion({
      title,
      description,
      metaDescription,
      metaKeywords,
      location,
      duration,
      regularPrice,
      discountPrice: discountPrice || undefined,
      activities: Array.isArray(activities) ? activities : [activities],
      inclusions: Array.isArray(inclusions) ? inclusions : [inclusions],
      exclusions: Array.isArray(exclusions) ? exclusions : [exclusions],
      preparationTips: preparationTips ? (Array.isArray(preparationTips) ? preparationTips : [preparationTips]) : [],
      featured: featured === 'on'
    });

    // Handle main image
    if (req.files && req.files.mainImage) {
      console.log('Processing main image');
      const mainImageFile = req.files.mainImage;
      
      // Generate unique filename
      const mainImageFilename = `${Date.now()}-${mainImageFile.name.replace(/\s+/g, '-')}`;
      const mainImagePath = path.join('uploads/excursions', mainImageFilename);
      
      // Create directories if they don't exist
      const uploadDir = path.join(__dirname, '../public/uploads/excursions');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Move file to uploads directory
      await mainImageFile.mv(path.join(__dirname, '../public', mainImagePath));
      
      // Set excursion main image path
      excursion.mainImage = `/${mainImagePath.replace(/\\/g, '/')}`;
    }

    // Handle additional images
    if (req.files && req.files.images) {
      console.log('Processing additional images');
      const additionalFiles = Array.isArray(req.files.images) 
        ? req.files.images 
        : [req.files.images];
      
      const imageDescriptions = req.body.imageDescription || [];
      const images = [];
      
      for (let i = 0; i < additionalFiles.length; i++) {
        const file = additionalFiles[i];
        
        // Generate unique filename
        const filename = `${Date.now()}-${i}-${file.name.replace(/\s+/g, '-')}`;
        const filePath = path.join('uploads/excursions', filename);
        
        // Move file to uploads directory
        await file.mv(path.join(__dirname, '../public', filePath));
        
        // Add to images array
        const webPath = `/${filePath.replace(/\\/g, '/')}`;
        images.push({
          path: webPath,
          description: Array.isArray(imageDescriptions) ? (imageDescriptions[i] || '') : ''
        });
      }
      
      excursion.images = images;
    }

    // Save excursion
    await excursion.save();
    
    // Return response based on request type
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        success: true,
        message: 'Excursion created successfully',
        excursion: {
          id: excursion._id,
          title: excursion.title,
          slug: excursion.slug
        }
      });
    } else {
      req.flash('success', 'Excursion created successfully');
      return res.redirect('/admin/excursions');
    }
  } catch (error) {
    console.error('Error creating excursion:', error);
    
    // Return response based on request type
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({
        success: false,
        message: `Failed to create excursion: ${error.message}`
      });
    } else {
      req.flash('error', `Failed to create excursion: ${error.message}`);
      return res.redirect('/admin/excursions/add');
    }
  }
};

exports.getEditExcursionForm = async (req, res) => {
    try {
        const excursion = await Excursion.findById(req.params.id);
        if (!excursion) {
            req.flash('error', 'Excursion not found');
            return res.redirect('/admin/excursions');
        }
        
        res.render('admin/edit-excursion', {
            excursion,
            currentPage: 'excursions'
        });
    } catch (error) {
        console.error('Error getting excursion for edit:', error);
        req.flash('error', 'Failed to load excursion');
        res.redirect('/admin/excursions');
    }
};

exports.updateExcursion = async (req, res) => {
    try {
        console.log('Updating excursion with data:', req.body);
        
        // Find existing excursion
        const excursion = await Excursion.findById(req.params.id);
        if (!excursion) {
            req.flash('error', 'Excursion not found');
            return res.redirect('/admin/excursions');
        }
        
        // Process arrays from form data
        const inclusions = req.body.inclusions ? 
            (Array.isArray(req.body.inclusions) ? req.body.inclusions : [req.body.inclusions]) : [];
        
        const exclusions = req.body.exclusions ? 
            (Array.isArray(req.body.exclusions) ? req.body.exclusions : [req.body.exclusions]) : [];
        
        const activities = req.body.activities ? 
            (Array.isArray(req.body.activities) ? req.body.activities : [req.body.activities]) : [];
        
        const preparationTips = req.body.preparationTips ? 
            (Array.isArray(req.body.preparationTips) ? req.body.preparationTips : [req.body.preparationTips]) : [];
        
        // Process images
        let mainImage = excursion.mainImage;
        if (req.files && req.files.mainImage) {
            mainImage = `/uploads/${req.files.mainImage[0].filename}`;
        }
        
        let images = excursion.images;
        if (req.files && req.files.images) {
            const newImages = req.files.images.map(file => `/uploads/${file.filename}`);
            images = [...images, ...newImages];
        }
        
        // Update excursion object
        const excursionData = {
            ...req.body,
            inclusions,
            exclusions,
            activities,
            preparationTips,
            mainImage,
            images,
            featured: req.body.featured === 'on'
        };
        
        const updatedExcursion = await Excursion.findByIdAndUpdate(
            req.params.id,
            excursionData,
            { new: true, runValidators: true }
        );
        
        console.log('Excursion updated successfully:', updatedExcursion._id);
        req.flash('success', 'Excursion updated successfully');
        res.redirect('/admin/excursions');
    } catch (error) {
        console.error('Error updating excursion:', error);
        req.flash('error', 'Failed to update excursion: ' + error.message);
        res.redirect(`/admin/excursions/edit/${req.params.id}`);
    }
};

exports.deleteExcursion = async (req, res) => {
    try {
        await Excursion.findByIdAndDelete(req.params.id);
        req.flash('success', 'Excursion deleted successfully');
        res.redirect('/admin/excursions');
    } catch (error) {
        console.error('Error deleting excursion:', error);
        req.flash('error', 'Failed to delete excursion');
        res.redirect('/admin/excursions');
    }
};

// Admin reservation controllers
exports.getAllReservationsAdmin = async (req, res) => {
    try {
        const reservations = await ExcursionReservation.find()
            .populate('excursion')
            .sort({ createdAt: -1 });
        
        res.render('admin/excursion-reservations', {
            reservations,
            currentPage: 'excursion-reservations'
        });
    } catch (error) {
        console.error('Error getting excursion reservations:', error);
        req.flash('error', 'Failed to load excursion reservations');
        res.redirect('/admin/dashboard');
    }
};

exports.updateReservationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        await ExcursionReservation.findByIdAndUpdate(id, { status });
        req.flash('success', 'Reservation status updated successfully');
        res.redirect('/admin/excursion-reservations');
    } catch (error) {
        console.error('Error updating reservation status:', error);
        req.flash('error', 'Failed to update reservation status');
        res.redirect('/admin/excursion-reservations');
    }
};

// Helper function to ensure all excursions have valid slugs
const ensureAllExcursionsHaveSlugs = async () => {
  try {
    const excursions = await Excursion.find({});
    let fixedCount = 0;
    
    for (const excursion of excursions) {
      if (!excursion.slug) {
        console.log(`Fixing missing slug for excursion "${excursion.title}"`);
        excursion.slug = slugify(excursion.title, { 
          lower: true,
          strict: true,
          remove: /[*+~.()'"!:@]/g
        });
        await excursion.save();
        fixedCount++;
      }
    }
    
    if (fixedCount > 0) {
      console.log(`Fixed slugs for ${fixedCount} excursions`);
    }
  } catch (error) {
    console.error('Error ensuring excursion slugs:', error);
  }
};

// Run the fix on module load
ensureAllExcursionsHaveSlugs();

// Public controllers
/**
 * Get all excursions
 * @route GET /excursions
 */
exports.getAllExcursions = async (req, res) => {
  try {
    console.log('Getting all excursions');
    const excursions = await Excursion.find({}).sort({ createdAt: -1 });
    console.log(`Found ${excursions.length} excursions`);
    
    // Ensure each excursion has a slug and save if needed
    for (const excursion of excursions) {
      if (!excursion.slug) {
        console.log(`Excursion ${excursion.title} has no slug, generating one`);
        excursion.slug = slugify(excursion.title, { lower: true });
        await excursion.save(); // Save to database to persist the slug
      }
      console.log(`Excursion: ${excursion.title}, Slug: ${excursion.slug}`);
    }
    
    // Check if we should use the admin view
    if (req.originalUrl.startsWith('/admin')) {
      return res.render('admin/excursions', {
        title: 'Manage Excursions',
        excursions
      });
    }
    
    // Frontend view with meta tags
    res.render('pages/excursions', {
      title: 'Excursions & Day Trips in Morocco',
      metaDescription: 'Discover amazing day trips and excursions in Morocco with our expert guides. Experience the beauty of Morocco with our carefully curated excursions.',
      metaKeywords: 'morocco excursions, day trips morocco, marrakech day trips, casablanca excursions, morocco guided excursions, atlas mountains day trip, essaouira day trip, morocco travel experts',
      excursions
    });
  } catch (error) {
    console.error('Error fetching excursions:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load excursions'
    });
  }
};

/**
 * Get excursion by slug
 * @route GET /excursions/:slug
 */
exports.getExcursionBySlug = async (req, res) => {
  try {
    // Decode the slug from the URL
    const encodedSlug = req.params.slug;
    const slug = decodeURIComponent(encodedSlug);
    
    console.log(`Looking for excursion with slug: "${slug}" (encoded as "${encodedSlug}")`);
    
    // First, try to find by slug
    let excursion = await Excursion.findOne({ slug: slug });
    
    if (!excursion) {
      console.log(`No excursion found with slug: "${slug}", trying case-insensitive search`);
      
      // If not found with exact match, try case-insensitive search
      const allExcursions = await Excursion.find({});
      const slugLower = slug.toLowerCase();
      
      // Log all available slugs for debugging
      console.log('Available slugs:');
      allExcursions.forEach(e => console.log(`- ${e.title}: "${e.slug}"`));
      
      // Try to find a case-insensitive match
      excursion = allExcursions.find(e => 
        e.slug && e.slug.toLowerCase() === slugLower
      );
      
      if (!excursion) {
        // Try finding by ID as a fallback
        try {
          excursion = await Excursion.findById(slug);
          if (excursion) {
            console.log(`Found excursion by ID: ${excursion.title}`);
          }
        } catch (idError) {
          // Not a valid ID, ignore this error
        }
        
        if (!excursion) {
          console.log(`Still no excursion found with slug: "${slug}" (case-insensitive)`);
          return res.status(404).render('error', {
            title: 'Excursion Not Found',
            message: 'The excursion you are looking for does not exist'
          });
        } else {
          console.log(`Found excursion with fallback method: ${excursion.title}`);
        }
      } else {
        console.log(`Found excursion with case-insensitive match: ${excursion.title}`);
      }
    } else {
      console.log(`Found excursion: ${excursion.title}`);
    }
    
    // Create description for meta tag
    const metaDescription = `${excursion.title} - ${excursion.description.substring(0, 155)}...`;
    
    res.render('pages/excursion-details', {
      title: `${excursion.title} | Morocco Travel Experts`,
      metaDescription,
      metaKeywords: `${excursion.title}, ${excursion.location} excursion, morocco day trip, morocco travel experts, ${excursion.activities.join(', ')}`,
      excursion
    });
  } catch (error) {
    console.error('Error fetching excursion details:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load excursion details'
    });
  }
};

exports.createReservation = async (req, res) => {
    try {
        const {
            excursionId,
            excursionTitle,
            name,
            email,
            phone,
            date,
            participants,
            message
        } = req.body;

        // Validate required fields
        if (!excursionId || !name || !email || !phone || !date || !participants) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required information'
            });
        }

        // Create reservation
        const reservation = await ExcursionReservation.create({
            excursion: excursionId,
            excursionTitle,
            name,
            email,
            phone,
            date,
            participants: Number(participants),
            message: message || '',
            status: 'pending',
            read: false // Explicitly mark as unread
        });

        console.log(`New excursion reservation created: ${reservation._id}`);

        // No WhatsApp notification, keeping it simple

        return res.status(200).json({
            success: true,
            message: 'Reservation submitted successfully. We will contact you shortly!'
        });
    } catch (error) {
        console.error('Error creating excursion reservation:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to submit reservation. Please try again later.'
        });
    }
};

exports.submitInquiry = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            message
        } = req.body;

        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide your name, email, and message'
            });
        }

        // Create a general reservation/inquiry
        const inquiry = await ExcursionReservation.create({
            name,
            email,
            phone: phone || '',
            message,
            status: 'inquiry',
            read: false // Explicitly mark as unread
        });

        console.log(`New excursion inquiry created: ${inquiry._id}`);

        return res.status(200).json({
            success: true,
            message: 'Inquiry submitted successfully. We will contact you shortly!'
        });
    } catch (error) {
        console.error('Error submitting excursion inquiry:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to submit inquiry. Please try again later.'
        });
    }
};

/**
 * Toggle featured status of an excursion
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.toggleFeatured = async (req, res) => {
  try {
    const excursion = await Excursion.findById(req.params.id);
    
    if (!excursion) {
      return res.status(404).json({ success: false, message: 'Excursion not found' });
    }
    
    // Toggle featured status
    excursion.featured = !excursion.featured;
    await excursion.save();
    
    return res.json({ 
      success: true, 
      message: `Excursion ${excursion.featured ? 'featured' : 'unfeatured'} successfully`,
      featured: excursion.featured
    });
  } catch (error) {
    console.error('Error toggling featured status:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred while updating featured status',
      error: error.message
    });
  }
};

// Admin Controllers
exports.getAdminExcursions = async (req, res) => {
  try {
    const excursions = await Excursion.find().sort({ createdAt: -1 });
    res.render('admin/excursions', { 
      excursions,
      title: 'Manage Excursions',
      activeLink: 'excursions'
    });
  } catch (error) {
    console.error('Error fetching excursions:', error);
    req.flash('error', 'Failed to load excursions');
    res.redirect('/admin/dashboard');
  }
};

exports.getNewExcursionForm = (req, res) => {
  res.render('admin/excursions-new', { 
    title: 'Add New Excursion',
    activeLink: 'excursions'
  });
};

exports.getEditExcursionForm = async (req, res) => {
  try {
    const excursion = await Excursion.findById(req.params.id);
    
    if (!excursion) {
      req.flash('error', 'Excursion not found');
      return res.redirect('/admin/excursions');
    }
    
    res.render('admin/edit-excursion', { 
      excursion,
      title: 'Edit Excursion',
      activeLink: 'excursions'
    });
  } catch (error) {
    console.error('Error fetching excursion:', error);
    req.flash('error', 'Failed to load excursion');
    res.redirect('/admin/excursions');
  }
};

exports.updateExcursion = async (req, res) => {
  try {
    console.log('Updating excursion:', req.params.id);
    const excursion = await Excursion.findById(req.params.id);
    
    if (!excursion) {
      console.log('Excursion not found');
      return res.status(404).json({ success: false, message: 'Excursion not found' });
    }

    // Process form data
    const {
      title,
      description,
      metaDescription,
      metaKeywords,
      location,
      duration,
      regularPrice,
      discountPrice,
      activities,
      inclusions,
      exclusions,
      preparationTips,
      featured,
      keepMainImage,
      mainImagePath,
      keepImages,
      imageDescriptionsData
    } = req.body;

    // Create update object
    const updateData = {
      title,
      description,
      metaDescription,
      metaKeywords,
      location,
      duration,
      regularPrice,
      discountPrice: discountPrice || undefined,
      activities: Array.isArray(activities) ? activities : [activities],
      inclusions: Array.isArray(inclusions) ? inclusions : [inclusions],
      exclusions: Array.isArray(exclusions) ? exclusions : [exclusions],
      preparationTips: preparationTips ? (Array.isArray(preparationTips) ? preparationTips : [preparationTips]) : [],
      featured: featured === 'on'
    };
    
    // Handle main image
    if (req.files && req.files.mainImageFile) {
      console.log('Processing new main image');
      const mainImageFile = req.files.mainImageFile;
      
      // Generate unique filename
      const mainImageFilename = `${Date.now()}-${mainImageFile.name.replace(/\s+/g, '-')}`;
      const mainImagePath = path.join('uploads', mainImageFilename);
      
      // Move file to uploads directory
      await mainImageFile.mv(path.join(__dirname, '../public', mainImagePath));
      
      // Update excursion with new image path
      updateData.mainImage = `/${mainImagePath.replace(/\\/g, '/')}`;
    } else if (keepMainImage !== 'on') {
      console.log('Removing main image');
      updateData.mainImage = '';
    } else if (mainImagePath && mainImagePath !== excursion.mainImage) {
      console.log('Using different existing image as main image');
      updateData.mainImage = mainImagePath;
    }
    
    // Process image descriptions
    const imageDescriptions = imageDescriptionsData ? JSON.parse(imageDescriptionsData) : {};
    
    // Handle additional images
    let currentImages = [];
    
    // Keep existing images if requested
    if (keepImages) {
      const keepImagesArray = Array.isArray(keepImages) ? keepImages : [keepImages];
      
      console.log('Keeping images:', keepImagesArray.length);
      
      currentImages = keepImagesArray.map(imagePath => {
        return {
          path: imagePath,
          description: imageDescriptions[imagePath] || ''
        };
      });
    }
    
    // Add new images
    if (req.files && req.files.additionalImages) {
      const additionalFiles = Array.isArray(req.files.additionalImages) 
        ? req.files.additionalImages 
        : [req.files.additionalImages];
      
      console.log('Processing new additional images:', additionalFiles.length);
      
      const newImageDescriptions = req.body.newImageDescription || [];
      
      for (let i = 0; i < additionalFiles.length; i++) {
        const file = additionalFiles[i];
        
        // Generate unique filename
        const filename = `${Date.now()}-${i}-${file.name.replace(/\s+/g, '-')}`;
        const filePath = path.join('uploads', filename);
        
        // Move file to uploads directory
        await file.mv(path.join(__dirname, '../public', filePath));
        
        // Add to images array
        const webPath = `/${filePath.replace(/\\/g, '/')}`;
        currentImages.push({
          path: webPath,
          description: Array.isArray(newImageDescriptions) ? (newImageDescriptions[i] || '') : ''
        });
      }
    }
    
    // Update images array
    updateData.images = currentImages;
    
    // Update excursion in database
    await Excursion.findByIdAndUpdate(req.params.id, updateData);
    
    console.log('Excursion updated successfully');
    return res.json({ 
      success: true, 
      message: 'Excursion updated successfully' 
    });
  } catch (error) {
    console.error('Error updating excursion:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred while updating the excursion',
      error: error.message
    });
  }
};

exports.deleteExcursion = async (req, res) => {
  try {
    const excursion = await Excursion.findById(req.params.id);
    
    if (!excursion) {
      req.flash('error', 'Excursion not found');
      return res.redirect('/admin/excursions');
    }
    
    // Delete associated files if needed
    // TODO: Add file deletion logic
    
    await Excursion.findByIdAndDelete(req.params.id);
    
    req.flash('success', 'Excursion deleted successfully');
    res.redirect('/admin/excursions');
  } catch (error) {
    console.error('Error deleting excursion:', error);
    req.flash('error', 'Failed to delete excursion');
    res.redirect('/admin/excursions');
  }
};

// Reservations Admin Controllers
exports.getAllReservationsAdmin = async (req, res) => {
  try {
    const reservations = await Reservation.find().sort({ createdAt: -1 })
      .populate('excursion', 'title');
    
    res.render('admin/excursion-reservations', {
      reservations,
      title: 'Excursion Reservations',
      activeLink: 'excursion-reservations'
    });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    req.flash('error', 'Failed to load reservations');
    res.redirect('/admin/dashboard');
  }
};

exports.updateReservationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    await Reservation.findByIdAndUpdate(req.params.id, { status });
    
    req.flash('success', 'Reservation status updated successfully');
    res.redirect('/admin/excursion-reservations');
  } catch (error) {
    console.error('Error updating reservation status:', error);
    req.flash('error', 'Failed to update reservation status');
    res.redirect('/admin/excursion-reservations');
  }
};

// Public Controllers
exports.getAllExcursions = async (req, res) => {
  try {
    const excursions = await Excursion.find().sort({ featured: -1, createdAt: -1 });
    
    res.render('pages/excursions', {
      excursions,
      title: 'Our Excursions',
      metaDescription: 'Explore our wide range of excursions in Morocco',
      metaKeywords: 'Morocco excursions, day trips, tours, activities'
    });
  } catch (error) {
    console.error('Error fetching excursions:', error);
    res.status(500).render('error', {
      message: 'Failed to load excursions',
      error: {},
      title: 'Error',
      metaDescription: 'Error page',
      metaKeywords: 'error'
    });
  }
};

exports.bookExcursion = async (req, res) => {
  try {
    const { name, email, phone, date, participants, message, excursionId } = req.body;
    
    const reservation = new Reservation({
      excursion: excursionId,
      name,
      email,
      phone,
      date,
      participants,
      message,
      status: 'pending'
    });
    
    await reservation.save();
    
    return res.json({
      success: true,
      message: 'Your booking request has been received! We will contact you shortly to confirm your reservation.'
    });
  } catch (error) {
    console.error('Error booking excursion:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process your booking. Please try again or contact us directly.'
    });
  }
};

exports.createReservation = async (req, res) => {
  try {
    const { excursionId, name, email, phone, date, participants, message } = req.body;
    
    const reservation = new Reservation({
      excursion: excursionId,
      name,
      email,
      phone,
      date,
      participants,
      message,
      status: 'pending'
    });
    
    await reservation.save();
    
    return res.json({
      success: true,
      message: 'Your reservation request has been received! We will contact you shortly to confirm your booking.'
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process your reservation. Please try again or contact us directly.'
    });
  }
};

exports.submitInquiry = async (req, res) => {
  try {
    const { name, email, phone, message, excursionTitle } = req.body;
    
    // TODO: Save inquiry to database or send email
    
    return res.json({
      success: true,
      message: 'Your inquiry has been received! We will get back to you as soon as possible.'
    });
  } catch (error) {
    console.error('Error submitting inquiry:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit your inquiry. Please try again or contact us directly.'
    });
  }
}; 