import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const {
  distanceKm,
  findNearbyVillages,
  parseGeoQuery,
} = require('../backend/src/services/cultureMap.service');

describe('culture map geo queries', () => {
  it('accepts a valid coordinate pair and applies the default radius', () => {
    assert.deepEqual(parseGeoQuery({ lat: '15.88', lng: '108.34' }), {
      lat: 15.88,
      lng: 108.34,
      radiusKm: 80,
    });
  });

  it('rejects partial, out-of-range, and excessive-radius inputs', () => {
    assert.match(parseGeoQuery({ lat: '15.88' }).error, /lat và lng/);
    assert.match(parseGeoQuery({ lat: '91', lng: '108' }).error, /không hợp lệ/);
    assert.match(parseGeoQuery({ lat: '15', lng: '108', radiusKm: '501' }).error, /500 km/);
  });

  it('calculates distance and keeps only villages inside the radius', () => {
    const origin = { lat: 15.88, lng: 108.34, radiusKm: 50 };
    const kimBong = { id: 'kim-bong', latitude: 15.866772, longitude: 108.329088 };
    const batTrang = { id: 'bat-trang', latitude: 20.976116, longitude: 105.913017 };
    const nearby = findNearbyVillages([batTrang, kimBong], origin);

    assert.equal(nearby.length, 1);
    assert.equal(nearby[0].village.id, 'kim-bong');
    assert.ok(nearby[0].distanceKm < 5);
    assert.ok(distanceKm(kimBong, batTrang) > 500);
  });
});
