import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import sellerApi from '../api/sellerApi';
import uploadApi from '../api/uploadApi';
import { toast } from '../components/ui/toastStore';
import {
  createSellerProductPayload,
  findSellerProductById,
  setUploadedImageUrl,
} from './sellerProductForm.helpers';

export function useSellerProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['seller-products'],
    queryFn: sellerApi.getProducts,
  });

  const product = useMemo(() => findSellerProductById(products, id), [products, id]);

  const uploadImage = useMutation({
    mutationFn: uploadApi.uploadImage,
    onSuccess: () => toast.success('Đã tải ảnh lên'),
    onError: (err) => toast.error(err.response?.data?.message || 'Không thể tải ảnh lên'),
  });

  const saveProduct = useMutation({
    mutationFn: (payload) =>
      isEdit ? sellerApi.updateProduct(id, payload) : sellerApi.createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      toast.success(isEdit ? 'Đã cập nhật sản phẩm' : 'Đã tạo sản phẩm');
      navigate('/seller/products');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Không thể lưu sản phẩm'),
  });

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    const form = event.currentTarget.form;
    if (!file || !form) return;

    const result = await uploadImage.mutateAsync(file);
    setUploadedImageUrl({ form, url: result.url });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveProduct.mutate(createSellerProductPayload(new FormData(event.currentTarget)));
  };

  return {
    cancel: () => navigate('/seller/products'),
    handleSubmit,
    handleUpload,
    isEdit,
    isLoading,
    product,
    saveProduct,
    uploadImage,
  };
}
