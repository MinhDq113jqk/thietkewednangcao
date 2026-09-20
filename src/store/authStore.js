import { create } from 'zustand';

if (typeof window !== 'undefined') {
  window.localStorage.removeItem('auth-storage');
}

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  role: null,
  isAuthenticated: false,
  isInitialized: false,

  login: ({ user, token }) => {
    set({
      user,
      token,
      role: user?.role ?? null,
      isAuthenticated: Boolean(user && token),
      isInitialized: true,
    });
  },

  logout: () => {
    set({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      isInitialized: true,
    });
  },

  finishInitialization: () => {
    set({ isInitialized: true });
  },

  setUser: (user) => {
    set({ user, role: user?.role ?? get().role });
  },

  setToken: (token) => {
    set({ token, isAuthenticated: Boolean(token && get().user) });
  },
}));

export default useAuthStore;
