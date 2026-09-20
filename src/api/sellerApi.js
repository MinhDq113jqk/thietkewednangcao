import axiosInstance from './axiosInstance';

const sellerApi = {
  getProducts: () => axiosInstance.get('/seller/products').then((res) => res.data),

  createProduct: (payload) =>
    axiosInstance.post('/seller/products', payload).then((res) => res.data),

  updateProduct: (id, payload) =>
    axiosInstance.put(`/seller/products/${id}`, payload).then((res) => res.data),

  hideProduct: (id) =>
    axiosInstance.delete(`/seller/products/${id}`).then((res) => res.data),

  restoreProduct: (id) =>
    axiosInstance.put(`/seller/products/${id}/restore`).then((res) => res.data),

  permanentDeleteProduct: (id) =>
    axiosInstance.delete(`/seller/products/${id}/permanent`).then((res) => res.data),

  getOrders: () => axiosInstance.get('/seller/orders').then((res) => res.data),

  getStats: () => axiosInstance.get('/seller/orders/stats').then((res) => res.data),

  confirmOrder: (id) =>
    axiosInstance.put(`/seller/orders/${id}/confirm`).then((res) => res.data),

  packOrder: (id) =>
    axiosInstance.put(`/seller/orders/${id}/pack`).then((res) => res.data),

  shipOrder: ({ id, ...payload }) =>
    axiosInstance.put(`/seller/orders/${id}/ship`, payload).then((res) => res.data),

  updateTracking: ({ id, ...payload }) =>
    axiosInstance.put(`/seller/orders/${id}/tracking`, payload).then((res) => res.data),

  deliverOrder: ({ id, ...payload }) =>
    axiosInstance.put(`/seller/orders/${id}/deliver`, payload).then((res) => res.data),
};

export default sellerApi;
