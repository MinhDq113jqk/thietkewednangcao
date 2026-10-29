import api from '../../../services/axiosInstance';

const afterSalesApi = {
  list: (mode, params) => api.get(mode === 'buyer' ? '/after-sales' : `/${mode}/after-sales`, { params }).then((r) => r.data),
  create: (orderId, payload) => api.post(`/after-sales/orders/${orderId}`, payload).then((r) => r.data),
  update: (mode, id, payload) => api.put(`/${mode}/after-sales/${id}`, payload).then((r) => r.data),
  finance: (id) => api.get(`/admin/after-sales/finance/${id}`).then((r) => r.data),
  refund: (payload) => api.post('/admin/after-sales/refunds', payload).then((r) => r.data),
  listCod: (mode, params) => api.get(`/${mode}/after-sales/cod`, { params }).then((r) => r.data),
  recordCod: (id, payload) => api.post(`/admin/after-sales/cod/${id}`, payload).then((r) => r.data),
};
export default afterSalesApi;
