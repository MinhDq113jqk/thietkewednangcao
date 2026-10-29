import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

const createLocalStorage = () => {
  const store = new Map();

  return {
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    removeItem: (key) => store.delete(key),
    setItem: (key, value) => store.set(key, String(value)),
  };
};

globalThis.localStorage = createLocalStorage();

const { default: useCartStore, cartItemKey } = await import('../src/features/cart/store/cartStore.js');

const resetCart = () => {
  localStorage.clear();
  useCartStore.setState({ items: [] });
};

describe('cartStore', () => {
  beforeEach(() => {
    resetCart();
  });

  it('adds a product with default quantity 1', () => {
    useCartStore.getState().addItem({
      id: 'product-1',
      name: 'Moc khoa',
      price: 35000,
    });

    assert.deepEqual(useCartStore.getState().items, [
      {
        id: 'product-1',
        name: 'Moc khoa',
        price: 35000,
        quantity: 1,
      },
    ]);
  });

  it('merges duplicate products and increases quantity', () => {
    const cart = useCartStore.getState();

    cart.addItem({ id: 'product-1', name: 'Moc khoa', price: 35000, quantity: 2 });
    cart.addItem({ id: 'product-1', name: 'Moc khoa moi', price: 30000, quantity: 3 });

    assert.deepEqual(useCartStore.getState().items, [
      {
        id: 'product-1',
        name: 'Moc khoa moi',
        price: 30000,
        quantity: 5,
      },
    ]);
  });

  it('updates quantity and ignores values below 1', () => {
    const cart = useCartStore.getState();

    cart.addItem({ id: 'product-1', name: 'Moc khoa', price: 35000 });
    cart.updateQuantity('product-1', 4);
    cart.updateQuantity('product-1', 0);

    assert.equal(useCartStore.getState().items[0].quantity, 4);
  });

  it('removes items and clears the cart', () => {
    const cart = useCartStore.getState();

    cart.addItem({ id: 'product-1', name: 'Moc khoa', price: 35000 });
    cart.addItem({ id: 'product-2', name: 'Non la', price: 55000 });
    cart.removeItem('product-1');

    assert.deepEqual(useCartStore.getState().items.map((item) => item.id), ['product-2']);

    useCartStore.getState().clearCart();
    assert.deepEqual(useCartStore.getState().items, []);
  });

  it('calculates total items and total price', () => {
    const cart = useCartStore.getState();

    cart.addItem({ id: 'product-1', name: 'Moc khoa', price: '35000', quantity: 2 });
    cart.addItem({ id: 'product-2', name: 'Non la', price: 55000, quantity: 1 });

    assert.equal(useCartStore.getState().totalItems(), 3);
    assert.equal(useCartStore.getState().totalPrice(), 125000);
  });

  it('keeps variants independent when adding, updating and removing lines', () => {
    const cart = useCartStore.getState();
    const red = { id: 'p1', variantId: 'red', price: 10000, quantity: 2 };
    const blue = { id: 'p1', variantId: 'blue', price: 20000, quantity: 3 };
    cart.addItem(red);
    cart.addItem(blue);
    cart.addItem({ ...red, quantity: 1 });
    assert.deepEqual(useCartStore.getState().items.map(i => [i.variantId, i.quantity]), [['red', 3], ['blue', 3]]);
    cart.updateQuantity(cartItemKey(red), 5);
    cart.updateQuantity('p1', 99);
    cart.removeItem('p1');
    assert.deepEqual(useCartStore.getState().items.map(i => i.quantity), [5, 3]);
    assert.equal(cart.totalPrice(), 110000);
    cart.removeItem(cartItemKey(red));
    assert.deepEqual(useCartStore.getState().items, [blue]);
  });

  it('rejects non-integer and non-finite quantities without corrupting persisted totals', () => {
    const cart = useCartStore.getState();
    cart.addItem({ id: 'p1', price: 10000 });
    for (const quantity of [0, -1, 1.5, NaN, Infinity, '2']) {
      cart.addItem({ id: 'p2', price: 20000, quantity });
      cart.updateQuantity('p1', quantity);
    }
    assert.equal(cart.totalItems(), 1);
    assert.equal(cart.totalPrice(), 10000);
    assert.deepEqual(JSON.parse(localStorage.getItem('cart-storage')).state.items, useCartStore.getState().items);
  });
});
