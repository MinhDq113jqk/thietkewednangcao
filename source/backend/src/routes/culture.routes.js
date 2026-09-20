const router = require('express').Router();
const controller = require('../controllers/culture.controller');

router.get('/regions', controller.listRegions);
router.get('/regions/:slug', controller.getRegion);
router.get('/products', controller.listCultureProducts);

module.exports = router;
