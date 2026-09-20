const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

exports.estimateShippingFee = ({ city, subtotal = 0 }) => {
  const amount = Number(subtotal) || 0;
  const normalizedCity = normalize(city);

  if (amount >= 500000) {
    return {
      provider: 'internal-estimator',
      fee: 0,
      etaDays: 3,
      note: 'Mien phi ship cho don tu 500.000 VND',
    };
  }

  if (normalizedCity.includes('ha noi') || normalizedCity.includes('hanoi')) {
    return { provider: 'internal-estimator', fee: 25000, etaDays: 2, note: 'Noi thanh/gan Ha Noi' };
  }

  if (
    normalizedCity.includes('ho chi minh')
    || normalizedCity.includes('hcm')
    || normalizedCity.includes('sai gon')
    || normalizedCity.includes('saigon')
  ) {
    return { provider: 'internal-estimator', fee: 30000, etaDays: 3, note: 'Khu vuc TP.HCM' };
  }

  return { provider: 'internal-estimator', fee: 40000, etaDays: 4, note: 'Tinh/thanh khac' };
};
