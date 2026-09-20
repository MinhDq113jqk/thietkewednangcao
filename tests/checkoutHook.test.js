import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculatePayableTotal,
  checkoutInitialForm,
  checkoutRequiredMessage,
  createCheckoutPayload,
  getCheckoutSuccessMessage,
  getShippingFee,
  hasRequiredCheckoutFields,
  updateCheckoutForm,
} from '../src/hooks/checkout.helpers.js';

describe('checkout hook helpers', () => {
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
    assert.equal(checkoutRequiredMessage, 'Vui lòng điền đầy đủ thông tin giao hàng');
  });

  it('calculates shipping fee and payable total', () => {
    assert.equal(getShippingFee(undefined), 0);
    assert.equal(getShippingFee({ fee: 30000 }), 30000);
    assert.equal(calculatePayableTotal(120000, 30000), 150000);
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
      shippingFee: 30000,
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
      shippingFee: 30000,
      paymentMethod: 'bank_transfer',
      note: 'Giao gio hanh chinh',
    });
  });

  it('selects success copy by payment method', () => {
    assert.match(getCheckoutSuccessMessage('bank_transfer'), /QR ngan hang|QR ngân hàng/);
    assert.match(getCheckoutSuccessMessage('cod'), /hành trình vận chuyển/);
  });
});
