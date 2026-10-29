import axiosInstance from '../../../services/axiosInstance';

const shippingApi = {
  estimate: (payload, signal) =>
    axiosInstance.post('/shipping/estimate', payload, { signal }).then((res) => res.data),
};

export default shippingApi;
