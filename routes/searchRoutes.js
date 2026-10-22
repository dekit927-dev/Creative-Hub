const express = require('express');
const router = express.Router();
const SearchController = require('../controllers/searchController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/search', optionalAuth, SearchController.search);
router.get('/categories', SearchController.listCategories);

module.exports = router;
