import axiosInstance from './axiosInstance';

const assistantApi = {
  sendMessage: (message) =>
    axiosInstance
      .post('/assistant/chat', { message })
      .then((response) => response.data),
};

export default assistantApi;
