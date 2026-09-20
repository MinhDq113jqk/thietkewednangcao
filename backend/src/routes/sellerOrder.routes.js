const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const ctrl = require('../controllers/order.controller');

router.use(auth, requireRole('seller', 'admin'));

router.get('/', ctrl.listSellerOrders);
router.get('/stats', ctrl.getSellerOrderStats);
router.put('/:id/confirm', ctrl.confirmSellerOrder);
router.put('/:id/pack', ctrl.packSellerOrder);
router.put('/:id/ship', ctrl.shipSellerOrder);
router.put('/:id/tracking', ctrl.updateSellerTracking);
router.put('/:id/deliver', ctrl.deliverSellerOrder);

module.exports = router;
