import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import shopApi from '../api/shopApi';
import uploadApi from '../api/uploadApi';
import { toast } from '../components/ui/toastStore';
import {
  createShopSettingsPayload,
  setUploadedShopImageUrl,
} from './shopSettings.helpers';

export function useSellerShopSettings() {
  const queryClient = useQueryClient();

  const { data: shop, isLoading, isError } = useQuery({
    queryKey: ['seller-shop'],
    queryFn: shopApi.getMyShop,
    retry: false,
  });

  const uploadImage = useMutation({
    mutationFn: uploadApi.uploadImage,
    onSuccess: () => toast.success('Đã tải ảnh lên'),
    onError: (err) => toast.error(err.response?.data?.message || 'Không thể tải ảnh lên'),
  });

  const updateShop = useMutation({
    mutationFn: shopApi.updateMyShop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-shop'] });
      toast.success('Đã cập nhật gian hàng');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Không thể cập nhật gian hàng'),
  });

  const handleUpload = async (event, fieldName) => {
    const file = event.target.files?.[0];
    const form = event.currentTarget.form;
    if (!file || !form) return;

    const result = await uploadImage.mutateAsync(file);
    setUploadedShopImageUrl({ form, fieldName, url: result.url });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    updateShop.mutate(createShopSettingsPayload(new FormData(event.currentTarget)));
  };

  return {
    handleSubmit,
    handleUpload,
    isError,
    isLoading,
    shop,
    updateShop,
    uploadImage,
  };
}
