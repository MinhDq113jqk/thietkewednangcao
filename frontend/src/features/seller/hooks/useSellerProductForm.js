import { useAccountQuery } from '../../../hooks/useAccountQuery';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import sellerApi from '../api/sellerApi';
import uploadApi from '../../../services/uploadApi';
import { toast } from '../../../components/ui/toastStore';
import {
  createSellerProductPayload,
  validateSellerProductForm,
} from './sellerProductForm.helpers';

export function useSellerProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState({});
  const [imageDraft, setImageDraft] = useState(null);

  const { data: product, isLoading, isError, refetch } = useAccountQuery({
    queryKey: ['seller-product', id],
    queryFn: () => sellerApi.getProduct(id),
    enabled: isEdit,
  });

  const images = imageDraft?.id === (id || 'new') ? imageDraft.items : (product?.images || []);
  const setImages = (items) => setImageDraft({ id: id || 'new', items });

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
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      toast.success(isEdit ? 'Đã cập nhật sản phẩm' : 'Đã tạo sản phẩm');
      navigate('/seller/products');
    },
    onError: (err) => {
      setErrors(err.response?.data?.error?.details || {});
      toast.error(err.response?.data?.message || 'Không thể lưu sản phẩm');
    },
  });

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || images.length >= 8) return;
    try {
      const result = await uploadImage.mutateAsync(file);
      setImageDraft((draft) => {
        const current = draft?.id === (id || 'new') ? draft.items : (product?.images || []);
        return { id: id || 'new', items: [...current, result.url].slice(0, 8) };
      });
    } catch { /* The mutation displays the upload error. */ }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (saveProduct.isPending || uploadImage.isPending) return;
    const formData = new FormData(event.currentTarget);
    const nextErrors = validateSellerProductForm(formData);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      event.currentTarget.elements[Object.keys(nextErrors)[0]]?.focus();
      return;
    }
    saveProduct.mutate(createSellerProductPayload(formData, { images }));
  };

  return {
    cancel: () => navigate('/seller/products'),
    handleSubmit,
    handleUpload,
    errors,
    images,
    setImages,
    isEdit,
    isLoading,
    isError,
    reloadProduct: async () => {
      const result = await refetch();
      if (result.isError) throw result.error;
      return result.data;
    },
    product,
    saveProduct,
    uploadImage,
  };
}
