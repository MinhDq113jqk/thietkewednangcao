const router = require('express').Router();
const assistantController = require('../controllers/assistant.controller');
const createRateLimit = require('../middleware/rateLimit');

router.use(createRateLimit({
  windowMs: 5 * 60 * 1000,
  max: 40,
}));

router.post('/chat', assistantController.chat);

module.exports = router;
