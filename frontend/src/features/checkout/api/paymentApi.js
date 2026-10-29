import axiosInstance from '../../../services/axiosInstance';

const paymentApi = {
  listReceipts: (params) => axiosInstance.get('/admin/payments/receipts', { params }).then((res) => res.data),
  getReceipt: (id) => axiosInstance.get(`/admin/payments/receipts/${id}`).then((res) => res.data),
  recordReceipt: (payload) => axiosInstance.post('/admin/payments/receipts', payload).then((res) => res.data),
  allocateReceipt: (id, payload) => axiosInstance.post(`/admin/payments/receipts/${id}/allocate`, payload).then((res) => res.data),
  getOrderBalance: (id) => axiosInstance.get(`/admin/payments/orders/${id}`).then((res) => res.data),
  expireOrders: () => axiosInstance.post('/admin/payments/expire').then((res) => res.data),
  generateVietQr: (orderId) =>
    axiosInstance.post('/payment/vietqr', { orderId }).then((res) => res.data),
};

export default paymentApi;
