import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const { calculateCheckoutQuote } = require('../../backend/src/services/checkoutQuote.service.js');
const { normalizeCartItems } = require('../../backend/src/services/checkoutIdempotency.service.js');
const products = ['a', 'b'].map((id) => ({
  id, shopId: `shop-${id}`, name: `Product ${id}`, price: '300000', salePrice: null, stock: 10, isActive: true,
}));
const shops = ['a', 'b'].map((id) => ({ id: `shop-${id}`, name: `Shop ${id}`, status: 'active' }));
const quote = (options = {}) => calculateCheckoutQuote({
  cartItems: normalizeCartItems([{ productId: 'a', quantity: 1 }, { productId: 'b', quantity: 1 }]),
  products, shops, city: 'Hà Nội', ...options,
}).quote;

describe('checkout pricing and per-shop shipping', () => {
  it('charges 650000 for two 300000 shops in Hà Nội', () => {
    const result = quote();
    assert.equal(result.subtotal, 600000);
    assert.equal(result.fee, 50000);
    assert.equal(result.total, 650000);
    assert.deepEqual(result.shops.map((shop) => shop.fee), [25000, 25000]);
    assert.equal(quote({ city: 'TP. Hồ Chí Minh' }).total, 660000);
    assert.equal(quote({ city: 'Đà Nẵng' }).total, 680000);
  });

  it('applies the free-shipping threshold to each shop using actual sale prices', () => {
    const result = quote({ products: [
      { ...products[0], price: '600000', salePrice: '499999' },
      { ...products[1], price: '500000' },
    ] });
    assert.deepEqual(result.shops.map((shop) => shop.fee), [25000, 0]);
    assert.equal(result.subtotal, 999999);
    assert.equal(result.total, 1024999);
    const sameShop = quote({ products: products.map((product) => ({ ...product, shopId: 'shop-a' })) });
    assert.equal(sameShop.shops.length, 1);
    assert.equal(sameShop.fee, 0);
  });

  it('detects price changes even when the cart total is unchanged', () => {
    const first = quote();
    const changed = quote({ products: [{ ...products[0], price: '400000' }, { ...products[1], price: '200000' }] });
    assert.equal(first.total, changed.total);
    assert.notEqual(first.fingerprint, changed.fingerprint);
    assert.equal(first.fingerprint, quote({ shops: shops.toReversed(), products: products.toReversed() }).fingerprint);
  });

  it('rejects unavailable products, inactive shops and insufficient aggregate stock', () => {
    assert.throws(() => quote({ products: [products[0]] }), { code: 'PRODUCT_UNAVAILABLE' });
    assert.throws(() => quote({ products: [{ ...products[0], isActive: false }, products[1]] }), { code: 'PRODUCT_UNAVAILABLE' });
    assert.throws(() => quote({ shops: [{ ...shops[0], status: 'suspended' }, shops[1]] }), { code: 'SHOP_NOT_ACTIVE' });
    assert.throws(() => quote({ cartItems: normalizeCartItems([
      { productId: 'a', quantity: 6 }, { productId: 'a', quantity: 5 },
    ]) }), { code: 'INSUFFICIENT_STOCK' });
  });
});
