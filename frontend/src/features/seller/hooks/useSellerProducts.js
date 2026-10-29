import { useAccountQuery } from '../../../hooks/useAccountQuery';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import sellerApi from '../api/sellerApi';
import { toast } from '../../../components/ui/toastStore';

export function useSellerProducts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');

  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useAccountQuery({
    queryKey: ['seller-products', { page, search, status, category }],
    queryFn: () => sellerApi.getProducts({ page, search, status, category }),
  });
  const products = data?.items || [];
  const filteredProducts = products;
  const categories = data?.categories || [];
  const invalidateProducts = () => {
    queryClient.invalidateQueries({ queryKey: ['seller-products'] });
  };

  const hideProduct = useMutation({
    mutationFn: sellerApi.hideProduct,
    onSuccess: () => {
      invalidateProducts();
      toast.success('Đã ẩn sản phẩm');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Không thể ẩn sản phẩm'),
  });

  const restoreProduct = useMutation({
    mutationFn: sellerApi.restoreProduct,
    onSuccess: () => {
      invalidateProducts();
      toast.success('Đã khôi phục sản phẩm');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Không thể khôi phục sản phẩm'),
  });

  const permanentDeleteProduct = useMutation({
    mutationFn: sellerApi.permanentDeleteProduct,
    onSuccess: () => {
      invalidateProducts();
      toast.success('Đã xóa vĩnh viễn sản phẩm');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Không thể xóa vĩnh viễn sản phẩm'),
  });

  const handlePermanentDelete = (product) => {
    if (!window.confirm(`Xóa vĩnh viễn "${product.name}"? Hành động này không thể hoàn tác.`)) return;
    permanentDeleteProduct.mutate(product.id);
  };

  return {
    data, page, setPage, refetch,
    categories,
    category,
    filteredProducts,
    handlePermanentDelete,
    hideProduct,
    isError,
    isLoading,
    permanentDeleteProduct,
    products,
    restoreProduct,
    search,
    setCategory: value => { setCategory(value); setPage(1); },
    setSearch: value => { setSearch(value); setPage(1); },
    setStatus: value => { setStatus(value); setPage(1); },
    status,
  };
}
