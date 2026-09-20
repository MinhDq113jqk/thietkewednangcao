import axiosInstance from './axiosInstance';

const productApi = {
  getProducts: (params = {}) =>
    axiosInstance
      .get(params.search ? '/products/search' : '/products', { params })
      .then((res) => res.data),

  getProduct: (id) =>
    axiosInstance.get(`/products/${id}`).then((res) => res.data),

  getRecommendations: (params = {}) =>
    axiosInstance.get('/products/recommendations', { params }).then((res) => res.data),
};

export default productApi;
