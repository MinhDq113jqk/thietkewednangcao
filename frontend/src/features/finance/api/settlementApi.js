import api from '../../../services/axiosInstance';
const root = '/admin/settlements';
const settlementApi = {
  shops: (params) => api.get(`${root}/shops`, { params }).then((r) => r.data),
  statement: (mode, id, params) => api.get(mode === 'admin' ? `${root}/shops/${id}` : '/seller/settlements', { params }).then((r) => r.data),
  period: (mode, id, params) => api.get(`/${mode}/settlements/periods/${id}`, { params }).then((r) => r.data),
  policy: (id, payload) => api.post(`${root}/shops/${id}/policy`, payload).then((r) => r.data),
  sync: (id) => api.post(`${root}/shops/${id}/sync`).then((r) => r.data),
  create: (id, payload) => api.post(`${root}/shops/${id}/periods`, payload).then((r) => r.data),
  adjust: (id, payload) => api.post(`${root}/shops/${id}/adjustments`, payload).then((r) => r.data),
  cancel: (id, payload) => api.post(`${root}/periods/${id}/cancel`, payload).then((r) => r.data),
  payout: (id, payload) => api.post(`${root}/periods/${id}/payout`, payload).then((r) => r.data),
};
export default settlementApi;
