import axiosInstance from './axiosInstance';

const uploadApi = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);

    return axiosInstance.post('/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res) => res.data);
  },
};

export default uploadApi;
