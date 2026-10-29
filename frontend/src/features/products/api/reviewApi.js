import axiosInstance from '../../../services/axiosInstance';

export default {
  listProduct: (productId, page = 1) => axiosInstance.get(`/products/${productId}/reviews`, { params: { page, limit: 5 } }).then((res) => res.data),
  listOrder: (orderId) => axiosInstance.get(`/orders/${orderId}/reviews`).then((res) => res.data),
  create: (orderId, payload) => axiosInstance.post(`/orders/${orderId}/reviews`, payload).then((res) => res.data),
};
