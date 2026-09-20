const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const ctrl = require('../controllers/admin.controller');

router.use(auth, requireRole('admin'));

router.get('/stats', ctrl.getStats);
router.get('/shops', ctrl.listShops);
router.put('/shops/:id/approve', ctrl.approveShop);
router.put('/shops/:id/suspend', ctrl.suspendShop);
router.get('/users', ctrl.listUsers);
router.put('/users/:id/status', ctrl.updateUserStatus);
router.get('/orders', ctrl.listOrders);
router.put('/orders/:id/status', ctrl.updateOrderStatus);
router.put('/orders/:id/payment', ctrl.updateOrderPayment);

module.exports = router;
