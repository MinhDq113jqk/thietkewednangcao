import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { calculateLineTotal } from '../../../utils/format.js';

export const cartItemKey = item => `${item.id}:${item.variantId || item.id}`;
// Raw product IDs remain supported only for lines without a selected variant.
const matchesLine = (item, key) => cartItemKey(item) === key || (!item.variantId && item.id === key);
const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const items = get().items;
        const existing = items.find((item) => cartItemKey(item) === cartItemKey(product));
        const quantityToAdd = product.quantity ?? 1;
        if (!Number.isSafeInteger(quantityToAdd) || quantityToAdd < 1) return;

        if (existing) {
          set({
            items: items.map((item) =>
              cartItemKey(item) === cartItemKey(product)
                ? { ...item, ...product, quantity: item.quantity + quantityToAdd }
                : item
            ),
          });
          return;
        }

        set({ items: [...items, { ...product, quantity: quantityToAdd }] });
      },

      removeItem: (id) => set({ items: get().items.filter((item) => !matchesLine(item, id)) }),

      updateQuantity: (id, quantity) => {
        if (!Number.isSafeInteger(quantity) || quantity < 1) return;
        set({
          items: get().items.map((item) =>
            matchesLine(item, id) ? { ...item, quantity } : item
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

      totalPrice: () => get().items.reduce((sum, item) => sum + calculateLineTotal(item), 0),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => globalThis.localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);

export default useCartStore;
