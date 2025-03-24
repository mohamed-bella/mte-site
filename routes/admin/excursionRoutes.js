const express = require('express');
const router = express.Router();
const excursionController = require('../../controllers/admin/excursionController');
const { isLoggedIn, isAdmin } = require('../../middleware/authMiddleware');

// GET excursion list
router.get('/', excursionController.excursion_list);

// GET request for creating a excursion
router.get('/new', excursionController.excursion_create_get);

// POST request for creating excursion
router.post('/new', excursionController.excursion_create_post);

// GET request to view excursion
router.get('/:id', excursionController.excursion_detail);

// GET request to edit excursion
router.get('/:id/edit', excursionController.excursion_update_get);

// POST request to update excursion
router.post('/:id/edit', excursionController.excursion_update_post);

// POST request to delete excursion
router.post('/:id/delete', excursionController.excursion_delete_post);

module.exports = router; 