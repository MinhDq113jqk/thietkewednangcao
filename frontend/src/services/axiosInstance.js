import axios from 'axios';
import useAuthStore from '../features/auth/store/authStore';
import { sessionSignal } from './sessionRequests';

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

let refreshRequest = null;

export const refreshAuthSession = () => {
  const sessionVersion = useAuthStore.getState().sessionVersion;
  if (!refreshRequest || refreshRequest.sessionVersion !== sessionVersion) {
    const current = { sessionVersion, promise: null };
    current.promise = refreshClient
      .post('/auth/refresh', undefined, { signal: sessionSignal() })
      .then((response) => {
        if (sessionVersion !== useAuthStore.getState().sessionVersion) throw new axios.CanceledError('Phiên đăng nhập đã thay đổi');
        useAuthStore.getState().login(response.data);
        return response.data;
      })
      .finally(() => {
        if (refreshRequest === current) refreshRequest = null;
      });
    refreshRequest = current;
  }

  return refreshRequest.promise;
};

axiosInstance.interceptors.request.use((config) => {
  config._sessionVersion ??= useAuthStore.getState().sessionVersion;
  if (config._sessionVersion !== useAuthStore.getState().sessionVersion) throw new axios.CanceledError('Phiên đăng nhập đã thay đổi');
  config.signal = config.signal ? AbortSignal.any([config.signal, sessionSignal()]) : sessionSignal();
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    if (response.config._sessionVersion !== useAuthStore.getState().sessionVersion) throw new axios.CanceledError('Phiên đăng nhập đã thay đổi');
    return response;
  },
  async (error) => {
    const request = error.config;
    if (axios.isCancel(error) || (request && request._sessionVersion !== useAuthStore.getState().sessionVersion)) return Promise.reject(error);
    const isSessionEndpoint = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password', '/auth/verify-email']
      .some((path) => String(request?.url || '').includes(path));

    if (error.response?.status === 401 && request && !request._authRetry && !isSessionEndpoint) {
      request._authRetry = true;

      try {
        const session = await refreshAuthSession();
        request.headers.Authorization = `Bearer ${session.token}`;
        return axiosInstance(request);
      } catch (refreshError) {
        if (axios.isCancel(refreshError) || request._sessionVersion !== useAuthStore.getState().sessionVersion) return Promise.reject(refreshError);
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
