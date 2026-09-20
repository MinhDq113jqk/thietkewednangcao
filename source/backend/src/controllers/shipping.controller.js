const { estimateShippingFee } = require('../services/shipping.service');

exports.estimate = (req, res) => {
  const result = estimateShippingFee({
    city: req.body.city || req.query.city,
    subtotal: req.body.subtotal || req.query.subtotal,
  });

  res.json(result);
};
