const baseUrl = String(process.env.API_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

const requestJson = async (path, expectedStatus = 200) => {
  const response = await fetch(`${baseUrl}${path}`);
  const payload = await response.json();
  if (response.status !== expectedStatus) {
    throw new Error(`${path}: expected ${expectedStatus}, received ${response.status}`);
  }
  return payload;
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const run = async () => {
  const regions = await requestJson('/api/culture/regions');
  assert(regions.total >= 4, 'Culture map must expose at least four seeded regions');

  const haNoi = regions.items.find((region) => region.slug === 'ha-noi');
  assert(haNoi?.villages?.length, 'Hà Nội must include at least one craft village');
  const village = haNoi.villages[0];

  const byVillage = await requestJson(`/api/culture/products?craftVillageId=${encodeURIComponent(village.id)}`);
  assert(byVillage.villages[0]?.id === village.id, 'Village product query returned the wrong village');
  assert(byVillage.items.length >= 1, 'Seeded craft village must expose linked products');

  const productDetail = await requestJson(`/api/products/${encodeURIComponent(byVillage.items[0].id)}`);
  assert(productDetail.craftVillage?.id === village.id, 'Product detail must expose its craft village');
  assert(productDetail.craftVillage?.region?.slug === 'ha-noi', 'Product detail must expose the village region');

  const nearby = await requestJson(
    `/api/culture/products?lat=${encodeURIComponent(village.latitude)}&lng=${encodeURIComponent(village.longitude)}&radiusKm=10`
  );
  assert(nearby.villages.some((item) => item.id === village.id), 'Coordinate query missed its origin village');
  assert(nearby.items.length >= 1, 'Coordinate query must return nearby linked products');

  const invalid = await requestJson('/api/culture/products?lat=91&lng=108', 400);
  assert(invalid.error?.code, 'Invalid coordinate response must use the shared error envelope');

  console.log(JSON.stringify({
    status: 'passed',
    regions: regions.total,
    villageProducts: byVillage.items.length,
    nearbyProducts: nearby.items.length,
  }));
};

run().catch((error) => {
  console.error(`Culture smoke failed: ${error.message}`);
  process.exit(1);
});
