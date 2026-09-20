const EARTH_RADIUS_KM = 6371;

const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseGeoQuery = (query) => {
  const hasLatitude = query.lat !== undefined;
  const hasLongitude = query.lng !== undefined;

  if (!hasLatitude && !hasLongitude) return null;
  if (!hasLatitude || !hasLongitude) {
    return { error: 'Cần cung cấp đồng thời lat và lng' };
  }

  const lat = toNumber(query.lat);
  const lng = toNumber(query.lng);
  const radiusKm = query.radiusKm === undefined ? 80 : toNumber(query.radiusKm);

  if (lat === null || lat < -90 || lat > 90 || lng === null || lng < -180 || lng > 180) {
    return { error: 'Tọa độ không hợp lệ' };
  }
  if (radiusKm === null || radiusKm <= 0 || radiusKm > 500) {
    return { error: 'Bán kính phải lớn hơn 0 và không vượt quá 500 km' };
  }

  return { lat, lng, radiusKm };
};

const toRadians = (degrees) => degrees * (Math.PI / 180);

const distanceKm = (left, right) => {
  const latDelta = toRadians(Number(right.latitude) - Number(left.latitude));
  const lngDelta = toRadians(Number(right.longitude) - Number(left.longitude));
  const leftLat = toRadians(Number(left.latitude));
  const rightLat = toRadians(Number(right.latitude));
  const haversine = (
    Math.sin(latDelta / 2) ** 2
    + Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(lngDelta / 2) ** 2
  );

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const findNearbyVillages = (villages, origin) => villages
  .map((village) => ({
    village,
    distanceKm: distanceKm(
      { latitude: origin.lat, longitude: origin.lng },
      { latitude: village.latitude, longitude: village.longitude }
    ),
  }))
  .filter((item) => item.distanceKm <= origin.radiusKm)
  .sort((left, right) => left.distanceKm - right.distanceKm);

module.exports = {
  distanceKm,
  findNearbyVillages,
  parseGeoQuery,
};
