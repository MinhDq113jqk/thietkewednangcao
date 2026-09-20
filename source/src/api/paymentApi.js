import axiosInstance from './axiosInstance';

const paymentApi = {
  generateVietQr: (orderId) =>
    axiosInstance.post('/payment/vietqr', { orderId }).then((res) => res.data),
};

export default paymentApi;
