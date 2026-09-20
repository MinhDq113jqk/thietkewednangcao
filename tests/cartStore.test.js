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

const { default: useCartStore } = await import('../src/store/cartStore.js');

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
});
