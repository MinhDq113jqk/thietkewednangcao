const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/auth.controller');
const createRateLimit = require('../middleware/rateLimit');

const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
});

router.post('/register', authRateLimit, ctrl.register);
router.post('/login', authRateLimit, ctrl.login);
router.post('/refresh', ctrl.refresh);
router.get ('/me',       auth, ctrl.me);
router.post('/logout', ctrl.logout);

module.exports = router;
