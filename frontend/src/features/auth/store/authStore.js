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
  sessionVersion: 0,

  login: ({ user, token }) => {
    set({
      user,
      token,
      role: user?.role ?? null,
      isAuthenticated: Boolean(user && token),
      isInitialized: true,
      sessionVersion: get().sessionVersion + (get().user?.id !== user?.id ? 1 : 0),
    });
  },

  logout: () => {
    set({
      sessionVersion: get().sessionVersion + 1,
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
    if (!user || user.id !== get().user?.id) return;
    set({ user, role: user?.role ?? get().role });
  },

  setToken: (token) => {
    set({ token, isAuthenticated: Boolean(token && get().user) });
  },
}));

export default useAuthStore;
