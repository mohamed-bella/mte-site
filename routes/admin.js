const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Excursion = require('../models/Excursion');
const { isAdmin } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/excursions');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb('Error: Images only!');
        }
    }
});

// Admin dashboard
router.get('/dashboard', isAdmin, async (req, res) => {
    try {
        const excursions = await Excursion.find().sort({ createdAt: -1 }).limit(5);
        res.render('admin/dashboard', { 
            excursions,
            title: 'Admin Dashboard',
            user: req.user
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render('error', { 
            title: 'Error',
            message: 'Failed to load dashboard'
        });
    }
});

// List all excursions
router.get('/excursions', isAdmin, async (req, res) => {
    try {
        const excursions = await Excursion.find().sort({ createdAt: -1 });
        res.render('admin/excursions', {
            excursions,
            title: 'Manage Excursions',
            user: req.user
        });
    } catch (error) {
        console.error('Excursions list error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load excursions'
        });
    }
});

// Show add excursion form
router.get('/excursions/new', isAdmin, (req, res) => {
    res.render('admin/add-excursion', {
        title: 'Add New Excursion',
        user: req.user
    });
});

// Create new excursion
router.post('/excursions', isAdmin, upload.array('images', 10), async (req, res) => {
    try {
        const excursionData = {
            ...req.body,
            images: req.files.map(file => `/uploads/excursions/${file.filename}`),
            mainImage: req.files.length > 0 ? `/uploads/excursions/${req.files[0].filename}` : '',
            inclusions: req.body.inclusions ? req.body.inclusions.split('\n').map(item => item.trim()) : [],
            exclusions: req.body.exclusions ? req.body.exclusions.split('\n').map(item => item.trim()) : [],
            activities: req.body.activities ? req.body.activities.split('\n').map(item => item.trim()) : [],
            preparationTips: req.body.preparationTips ? req.body.preparationTips.split('\n').map(item => item.trim()) : []
        };

        const excursion = new Excursion(excursionData);
        await excursion.save();

        req.flash('success', 'Excursion created successfully');
        res.redirect('/admin/excursions');
    } catch (error) {
        console.error('Create excursion error:', error);
        req.flash('error', 'Failed to create excursion');
        res.redirect('/admin/excursions/new');
    }
});

// Show edit excursion form
router.get('/excursions/:id/edit', isAdmin, async (req, res) => {
    try {
        const excursion = await Excursion.findById(req.params.id);
        if (!excursion) {
            req.flash('error', 'Excursion not found');
            return res.redirect('/admin/excursions');
        }
        
        res.render('admin/edit-excursion', {
            excursion,
            title: 'Edit Excursion',
            user: req.user
        });
    } catch (error) {
        console.error('Edit excursion form error:', error);
        req.flash('error', 'Failed to load excursion');
        res.redirect('/admin/excursions');
    }
});

// Update excursion
router.put('/excursions/:id', isAdmin, upload.array('images', 10), async (req, res) => {
    try {
        const excursion = await Excursion.findById(req.params.id);
        if (!excursion) {
            req.flash('error', 'Excursion not found');
            return res.redirect('/admin/excursions');
        }

        // Handle image uploads
        const newImages = req.files.map(file => `/uploads/excursions/${file.filename}`);
        const existingImages = req.body.existingImages ? 
            (Array.isArray(req.body.existingImages) ? req.body.existingImages : [req.body.existingImages]) : 
            [];

        // Delete removed images from storage
        const removedImages = excursion.images.filter(img => !existingImages.includes(img));
        for (const img of removedImages) {
            try {
                await fs.unlink(path.join('public', img));
            } catch (err) {
                console.error('Failed to delete image:', err);
            }
        }

        const updateData = {
            ...req.body,
            images: [...existingImages, ...newImages],
            mainImage: req.body.mainImage || existingImages[0] || newImages[0] || excursion.mainImage,
            inclusions: req.body.inclusions ? req.body.inclusions.split('\n').map(item => item.trim()) : [],
            exclusions: req.body.exclusions ? req.body.exclusions.split('\n').map(item => item.trim()) : [],
            activities: req.body.activities ? req.body.activities.split('\n').map(item => item.trim()) : [],
            preparationTips: req.body.preparationTips ? req.body.preparationTips.split('\n').map(item => item.trim()) : []
        };

        await Excursion.findByIdAndUpdate(req.params.id, updateData);
        
        req.flash('success', 'Excursion updated successfully');
        res.redirect('/admin/excursions');
    } catch (error) {
        console.error('Update excursion error:', error);
        req.flash('error', 'Failed to update excursion');
        res.redirect(`/admin/excursions/${req.params.id}/edit`);
    }
});

// Delete excursion
router.delete('/excursions/:id', isAdmin, async (req, res) => {
    try {
        const excursion = await Excursion.findById(req.params.id);
        if (!excursion) {
            return res.status(404).json({ success: false, message: 'Excursion not found' });
        }

        // Delete associated images
        for (const img of excursion.images) {
            try {
                await fs.unlink(path.join('public', img));
            } catch (err) {
                console.error('Failed to delete image:', err);
            }
        }

        await Excursion.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Excursion deleted successfully' });
    } catch (error) {
        console.error('Delete excursion error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete excursion' });
    }
});

// Toggle featured status
router.patch('/excursions/:id/toggle-featured', isAdmin, async (req, res) => {
    try {
        const excursion = await Excursion.findById(req.params.id);
        if (!excursion) {
            return res.status(404).json({ success: false, message: 'Excursion not found' });
        }

        excursion.featured = !excursion.featured;
        await excursion.save();

        res.json({ 
            success: true, 
            message: `Excursion ${excursion.featured ? 'featured' : 'unfeatured'} successfully`,
            featured: excursion.featured
        });
    } catch (error) {
        console.error('Toggle featured status error:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle featured status' });
    }
});

module.exports = router; 