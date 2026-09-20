const multer = require('multer');
const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const ctrl = require('../controllers/upload.controller');

const acceptedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const fileFilter = (_req, file, callback) => {
  if (!acceptedImageTypes.has(file.mimetype)) {
    return callback(new Error('Chi chap nhan file anh'));
  }
  return callback(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post(
  '/image',
  auth,
  requireRole('seller', 'admin'),
  upload.single('image'),
  ctrl.uploadImage,
);

router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'File anh toi da 5MB' });
  }

  if (err.message === 'Chi chap nhan file anh') {
    return res.status(400).json({ message: err.message });
  }

  return next(err);
});

module.exports = router;
