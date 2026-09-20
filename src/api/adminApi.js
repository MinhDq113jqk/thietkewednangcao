import axiosInstance from './axiosInstance';

const adminApi = {
  getStats: () => axiosInstance.get('/admin/stats').then((res) => res.data),

  getShops: (params = {}) =>
    axiosInstance.get('/admin/shops', { params }).then((res) => res.data),

  approveShop: (id) =>
    axiosInstance.put(`/admin/shops/${id}/approve`).then((res) => res.data),

  suspendShop: (id) =>
    axiosInstance.put(`/admin/shops/${id}/suspend`).then((res) => res.data),

  getUsers: (params = {}) =>
    axiosInstance.get('/admin/users', { params }).then((res) => res.data),

  updateUserStatus: (id, isActive) =>
    axiosInstance.put(`/admin/users/${id}/status`, { isActive }).then((res) => res.data),

  getOrders: (params = {}) =>
    axiosInstance.get('/admin/orders', { params }).then((res) => res.data),

  updateOrderStatus: (id, status) =>
    axiosInstance.put(`/admin/orders/${id}/status`, { status }).then((res) => res.data),

  updateOrderPayment: (id, status, payload = {}) =>
    axiosInstance.put(`/admin/orders/${id}/payment`, { status, ...payload }).then((res) => res.data),
};

export default adminApi;
