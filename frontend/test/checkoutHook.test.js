import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkoutInitialForm,
  checkoutRequiredMessage,
  createCheckoutPayload,
  getCheckoutSuccessMessage,
  getShippingFee,
  hasCheckoutQuote,
  hasRequiredCheckoutFields,
  keepCheckoutAttempt,
  updateCheckoutForm,
  formFromSavedAddress,
} from '../src/features/checkout/hooks/checkout.helpers.js';

describe('checkout hook helpers', () => {
  it('copies a valid saved address without overwriting notes or mutating source; rejects invalid saved data', () => {
    const saved = { name: 'Người nhận', phone: '090 000 0000', detail: 'Địa chỉ thử', city: 'Hà Nội' };
    const result = formFromSavedAddress(saved, { ...checkoutInitialForm, note: 'Giao buổi sáng' });
    assert.equal(result.address, saved.detail); assert.equal(result.phone, '0900000000'); assert.equal(result.note, 'Giao buổi sáng');
    assert.equal(saved.phone, '090 000 0000');
    assert.equal(formFromSavedAddress({ ...saved, phone: 'invalid' }, checkoutInitialForm), null);
    assert.equal(formFromSavedAddress(null, checkoutInitialForm), null);
  });
  it('updates checkout form fields immutably', () => {
    const nextForm = updateCheckoutForm(checkoutInitialForm, 'city', 'Ha Noi');

    assert.equal(checkoutInitialForm.city, '');
    assert.equal(nextForm.city, 'Ha Noi');
  });

  it('validates required shipping fields', () => {
    assert.equal(hasRequiredCheckoutFields(checkoutInitialForm), false);
    assert.equal(hasRequiredCheckoutFields({
      name: 'Minh',
      phone: '0900000000',
      address: '1 Pho Hue',
      city: 'Ha Noi',
      note: '',
    }), true);
    assert.equal(hasRequiredCheckoutFields({ name: ' ', phone: '1', address: '1', city: 'Hà Nội' }), false);
    assert.equal(checkoutRequiredMessage, 'Vui lòng điền đầy đủ thông tin giao hàng');
  });

  it('distinguishes missing shipping fees from a free quote', () => {
    assert.equal(getShippingFee(undefined), null);
    assert.equal(getShippingFee({ fee: 30000 }), 30000);
    assert.equal(getShippingFee({ fee: 0 }), 0);
  });

  it('requires a complete current quote even when shipping is free', () => {
    assert.equal(hasCheckoutQuote(undefined), false);
    assert.equal(hasCheckoutQuote({ fee: 0 }), false);
    const quote = { subtotal: 600000, fee: 0, total: 600000, fingerprint: 'a'.repeat(64), shops: [{}] };
    assert.equal(hasCheckoutQuote(quote), true);
    assert.equal(hasCheckoutQuote({ ...quote, total: 0 }), false);
    assert.equal(hasCheckoutQuote({ ...quote, shops: [] }), false);
  });

  it('retains the same submission when its result is uncertain', () => {
    assert.equal(keepCheckoutAttempt({}), true);
    assert.equal(keepCheckoutAttempt({ response: { status: 503 } }), true);
    assert.equal(keepCheckoutAttempt({ response: { status: 409, data: { error: { code: 'ORDER_IN_PROGRESS' } } } }), true);
    assert.equal(keepCheckoutAttempt({ response: { status: 409, data: { error: { code: 'CHECKOUT_QUOTE_CHANGED' } } } }), false);
    assert.equal(keepCheckoutAttempt({ response: { status: 409, data: { error: { code: 'INSUFFICIENT_STOCK' } } } }), false);
  });

  it('creates order payload from cart and form state', () => {
    assert.deepEqual(createCheckoutPayload({
      items: [
        { id: 'product-1', quantity: 2 },
        { id: 'product-2', quantity: 1 },
      ],
      form: {
        name: 'Minh',
        phone: '0900000000',
        address: '1 Pho Hue',
        city: 'Ha Noi',
        note: 'Giao gio hanh chinh',
      },
      quote: { fingerprint: 'a'.repeat(64) },
      payment: 'bank_transfer',
    }), {
      items: [
        { productId: 'product-1', quantity: 2 },
        { productId: 'product-2', quantity: 1 },
      ],
      shippingAddress: {
        name: 'Minh',
        phone: '0900000000',
        address: '1 Pho Hue',
        city: 'Ha Noi',
      },
      quoteFingerprint: 'a'.repeat(64),
      paymentMethod: 'bank_transfer',
      note: 'Giao gio hanh chinh',
    });
  });

  it('normalizes checkout phones and rejects invalid fields before payload creation', () => {
    const input = { items: [], quote: { fingerprint: 'a'.repeat(64) }, payment: 'cod',
      form: { name: ' Buyer ', phone: '+84 (912) 345-678', address: ' Street ', city: ' Hà Nội ', note: '' } };
    assert.equal(createCheckoutPayload(input).shippingAddress.phone, '+84912345678');
    for (const patch of [{ phone: 'wrong' }, { name: [] }, { address: 'x'.repeat(301) }]) {
      const form = { ...input.form, ...patch };
      assert.equal(hasRequiredCheckoutFields(form), false);
      assert.throws(() => createCheckoutPayload({ ...input, form }));
    }
  });

  it('selects success copy by payment method', () => {
    assert.match(getCheckoutSuccessMessage('bank_transfer'), /QR ngan hang|QR ngân hàng/);
    assert.match(getCheckoutSuccessMessage('cod'), /hành trình vận chuyển/);
  });
});
