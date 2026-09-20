const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const ctrl = require('../controllers/product.controller');

router.use(auth, requireRole('seller', 'admin'));

router.get('/', ctrl.listSellerProducts);
router.post('/', ctrl.createSellerProduct);
router.put('/:id', ctrl.updateSellerProduct);
router.put('/:id/restore', ctrl.restoreSellerProduct);
router.delete('/:id/permanent', ctrl.permanentDeleteSellerProduct);
router.delete('/:id', ctrl.deleteSellerProduct);

module.exports = router;
