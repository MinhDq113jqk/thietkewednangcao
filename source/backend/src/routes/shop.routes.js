const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const ctrl = require('../controllers/shop.controller');

router.post('/register', auth, ctrl.registerShop);
router.get('/me', auth, requireRole('seller', 'admin'), ctrl.getMyShop);
router.put('/me', auth, requireRole('seller', 'admin'), ctrl.updateMyShop);
router.get('/:slug/products', ctrl.getShopProducts);
router.get('/:slug', ctrl.getShopBySlug);

module.exports = router;
