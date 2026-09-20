import axiosInstance from './axiosInstance';

const orderApi = {
  createOrder: ({ payload, idempotencyKey }) =>
    axiosInstance.post('/orders', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
      timeout: 30000,
    }).then((res) => res.data),

  getOrders: () =>
    axiosInstance.get('/orders').then((res) => res.data),

  getOrder: (id) =>
    axiosInstance.get(`/orders/${id}`).then((res) => res.data),

  cancelOrder: (id) =>
    axiosInstance.put(`/orders/${id}/cancel`).then((res) => res.data),
};

export default orderApi;
