import axiosInstance from './axiosInstance';

const cultureApi = {
  getRegions: () => axiosInstance.get('/culture/regions').then((response) => response.data),
  getRegion: (slug) => axiosInstance.get(`/culture/regions/${slug}`).then((response) => response.data),
  getProducts: (params) => axiosInstance.get('/culture/products', { params }).then((response) => response.data),
};

export default cultureApi;
