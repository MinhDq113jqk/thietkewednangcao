const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/order.controller');

router.use(auth);

router.post('/', ctrl.createOrder);
router.get('/', ctrl.listMyOrders);
router.get('/:id', ctrl.getMyOrderById);
router.put('/:id/cancel', ctrl.cancelMyOrder);

module.exports = router;
