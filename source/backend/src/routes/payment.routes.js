const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/payment.controller');

router.use(auth);

router.post('/vietqr', ctrl.generateOrderQr);
router.post('/vietqr/:orderId', ctrl.generateOrderQr);

module.exports = router;
