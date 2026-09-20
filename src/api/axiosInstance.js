import axios from 'axios';
import useAuthStore from '../store/authStore';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const axiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
});

let refreshPromise = null;

export const refreshAuthSession = () => {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh')
      .then((response) => {
        useAuthStore.getState().login(response.data);
        return response.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    const isSessionEndpoint = ['/auth/login', '/auth/register', '/auth/refresh']
      .some((path) => String(request?.url || '').includes(path));

    if (error.response?.status === 401 && request && !request._authRetry && !isSessionEndpoint) {
      request._authRetry = true;

      try {
        const session = await refreshAuthSession();
        request.headers.Authorization = `Bearer ${session.token}`;
        return axiosInstance(request);
      } catch {
        useAuthStore.getState().logout();
        if (window.location.pathname !== '/login') {
          window.location.assign(`/login?from=${encodeURIComponent(window.location.pathname)}`);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
