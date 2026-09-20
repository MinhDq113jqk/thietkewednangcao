const router = require('express').Router();
const ctrl = require('../controllers/shipping.controller');

router.get('/estimate', ctrl.estimate);
router.post('/estimate', ctrl.estimate);

module.exports = router;
