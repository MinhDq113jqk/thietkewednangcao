import axiosInstance from './axiosInstance';

const shopApi = {
  getMyShop: () => axiosInstance.get('/shops/me').then((res) => res.data),

  registerShop: (payload) =>
    axiosInstance.post('/shops/register', payload).then((res) => res.data),

  updateMyShop: (payload) =>
    axiosInstance.put('/shops/me', payload).then((res) => res.data),
};

export default shopApi;
