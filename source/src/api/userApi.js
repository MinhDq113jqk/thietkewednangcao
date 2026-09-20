import axiosInstance from './axiosInstance';

const userApi = {
  getProfile: () =>
    axiosInstance.get('/users/profile').then((res) => res.data),

  updateProfile: (payload) =>
    axiosInstance.put('/users/profile', payload).then((res) => res.data),

  changePassword: (payload) =>
    axiosInstance.put('/users/password', payload).then((res) => res.data),

  getAddresses: () =>
    axiosInstance.get('/users/addresses').then((res) => res.data),

  createAddress: (payload) =>
    axiosInstance.post('/users/addresses', payload).then((res) => res.data),

  updateAddress: (id, payload) =>
    axiosInstance.put(`/users/addresses/${id}`, payload).then((res) => res.data),

  deleteAddress: (id) =>
    axiosInstance.delete(`/users/addresses/${id}`).then((res) => res.data),
};

export default userApi;
