const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/user.controller');

router.get   ('/profile',        auth, ctrl.getProfile);
router.put   ('/profile',        auth, ctrl.updateProfile);
router.put   ('/password',       auth, ctrl.changePassword);
router.get   ('/addresses',      auth, ctrl.getAddresses);
router.post  ('/addresses',      auth, ctrl.addAddress);
router.put   ('/addresses/:id',  auth, ctrl.updateAddress);
router.delete('/addresses/:id',  auth, ctrl.deleteAddress);

module.exports = router;
