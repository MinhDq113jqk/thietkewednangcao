import { create } from 'zustand';

let nextToastId = 0;

export const useToastStore = create((set) => ({
  toasts: [],
  add: (toast) => set((state) => ({
    toasts: [...state.toasts, { id: ++nextToastId, ...toast }],
  })),
  remove: (id) => set((state) => ({
    toasts: state.toasts.filter((toast) => toast.id !== id),
  })),
}));

export const toast = {
  success: (message) => useToastStore.getState().add({ type: 'success', message }),
  error: (message) => useToastStore.getState().add({ type: 'error', message }),
  warning: (message) => useToastStore.getState().add({ type: 'warning', message }),
};
