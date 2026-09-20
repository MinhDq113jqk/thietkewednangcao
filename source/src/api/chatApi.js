import axiosInstance from './axiosInstance';

const chatApi = {
  startConversation: (payload) =>
    axiosInstance.post('/conversations', payload).then((response) => response.data),

  getConversations: () =>
    axiosInstance.get('/conversations').then((response) => response.data),

  getMessages: (conversationId) =>
    axiosInstance
      .get(`/conversations/${conversationId}/messages`)
      .then((response) => response.data),

  sendMessage: (conversationId, body) =>
    axiosInstance
      .post(`/conversations/${conversationId}/messages`, { body })
      .then((response) => response.data),

  markRead: (conversationId) =>
    axiosInstance
      .put(`/conversations/${conversationId}/read`)
      .then((response) => response.data),
};

export default chatApi;
