const router = require('express').Router();
const ctrl = require('../controllers/product.controller');
const optionalAuth = require('../middleware/optionalAuth');

router.get('/', ctrl.listProducts);
router.get('/search', ctrl.searchProducts);
router.get('/recommendations', optionalAuth, ctrl.getRecommendations);
router.get('/:id', ctrl.getProductById);

module.exports = router;
