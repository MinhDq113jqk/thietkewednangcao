import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { calculateLineTotal } from '../utils/format.js';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const items = get().items;
        const existing = items.find((item) => item.id === product.id);
        const quantityToAdd = product.quantity || 1;

        if (existing) {
          set({
            items: items.map((item) =>
              item.id === product.id
                ? { ...item, ...product, quantity: item.quantity + quantityToAdd }
                : item
            ),
          });
          return;
        }

        set({ items: [...items, { ...product, quantity: quantityToAdd }] });
      },

      removeItem: (id) => set({ items: get().items.filter((item) => item.id !== id) }),

      updateQuantity: (id, quantity) => {
        if (quantity < 1) return;
        set({
          items: get().items.map((item) =>
            item.id === id ? { ...item, quantity } : item
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
