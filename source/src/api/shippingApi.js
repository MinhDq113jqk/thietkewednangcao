import axiosInstance from './axiosInstance';

const shippingApi = {
  estimate: (payload) =>
    axiosInstance.post('/shipping/estimate', payload).then((res) => res.data),
};

export default shippingApi;
