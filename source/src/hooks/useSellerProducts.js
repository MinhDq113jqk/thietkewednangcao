import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import sellerApi from '../api/sellerApi';
import { toast } from '../components/ui/toastStore';
import { filterSellerProducts, getSellerProductCategories } from './sellerProducts.helpers';

export function useSellerProducts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');

  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ['seller-products'],
    queryFn: sellerApi.getProducts,
  });

  const categories = useMemo(() => getSellerProductCategories(products), [products]);

  const filteredProducts = useMemo(
    () => filterSellerProducts({ products, search, status, category }),
    [category, products, search, status],
  );

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
    setCategory,
    setSearch,
    setStatus,
    status,
  };
}
