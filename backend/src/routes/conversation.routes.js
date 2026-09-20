const router = require('express').Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/conversation.controller');

router.use(auth);

router.post('/', controller.startConversation);
router.get('/', controller.listConversations);
router.get('/:id/messages', controller.listMessages);
router.post('/:id/messages', controller.sendMessage);
router.put('/:id/read', controller.markConversationRead);

module.exports = router;
