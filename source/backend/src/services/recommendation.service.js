const parsePreferenceCategories = (query = {}) =>
  [...new Set(
    String(query.categories || query.category || '')
      .split(',')
      .map((category) => category.trim())
      .filter(Boolean)
  )].slice(0, 6);

const scoreRecommendation = ({ product, reference, preferredCategories = [], now = Date.now() }) => {
  let score = 0;
  let reason = 'Được cộng đồng yêu thích';
  const sold = Number(product.sold || 0);
  const shopRating = Number(product.shop?.rating || 0);

  const preferenceIndex = preferredCategories.findIndex(
    (category) =>
      category.toLocaleLowerCase('vi') ===
      String(product.category || '').toLocaleLowerCase('vi')
  );
  if (preferenceIndex >= 0) {
    score += 60 - preferenceIndex * 8;
    reason = `Hợp sở thích ${product.category}`;
  }

  if (reference) {
    if (reference.category && reference.category === product.category) {
      score += 70;
      reason = `Cùng dòng ${product.category}`;
    }
    if (reference.shopId === product.shopId) score += 10;

    const referencePrice = Number(reference.salePrice || reference.price || 0);
    const productPrice = Number(product.salePrice || product.price || 0);
    if (referencePrice > 0 && productPrice > 0) {
      const priceDistance = Math.abs(productPrice - referencePrice) / referencePrice;
      score += Math.max(0, 20 - priceDistance * 20);
    }
  }

  score += Math.log1p(sold) * 5;
  score += shopRating * 2;

  const ageInDays = (now - new Date(product.createdAt).getTime()) / 86400000;
  if (ageInDays <= 30) score += 8;

  return { reason, score };
};

module.exports = {
  parsePreferenceCategories,
  scoreRecommendation,
};
