const uploadService = require('../services/upload.service');

exports.uploadImage = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Chua co file anh' });
  }

  try {
    const result = await uploadService.uploadImage(req.file);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
};
