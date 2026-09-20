import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import productApi from '../api/productApi';
import useCartStore from '../store/cartStore';
import {
  applyProductParams,
  createProductQueryParams,
  toPositivePage,
} from './productList.helpers';

export { productCategories, productSortOptions } from './productList.helpers';

export function useProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const addItem = useCartStore((state) => state.addItem);

  const selected = searchParams.get('category') || 'Tất cả';
  const searchFromUrl = searchParams.get('search') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = toPositivePage(searchParams.get('page'));
  const limit = 12;

  const queryParams = createProductQueryParams({
    selected,
    searchFromUrl,
    minPrice,
    maxPrice,
    sort,
    page,
    limit,
  });

  const query = useQuery({
    queryKey: ['products', selected, searchFromUrl, minPrice, maxPrice, sort, page],
    queryFn: () => productApi.getProducts(queryParams),
  });

  const data = query.data;
  const totalPages = data?.totalPages || 1;

  const updateParams = (next) => {
    setSearchParams(applyProductParams({ currentParams: searchParams, next }));
  };

  const submitFilters = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    updateParams({
      search: String(formData.get('search') || '').trim(),
      minPrice: String(formData.get('minPrice') || '').trim(),
      maxPrice: String(formData.get('maxPrice') || '').trim(),
    });
  };

  const resetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const changePage = (nextPage) => {
    updateParams({ page: Math.min(Math.max(1, nextPage), totalPages) });
  };

  return {
    addItem,
    changePage,
    error: query.error,
    isError: query.isError,
    isLoading: query.isLoading,
    limit,
    maxPrice,
    minPrice,
    page,
    products: data?.items || [],
    resetFilters,
    searchFromUrl,
    selected,
    sort,
    submitFilters,
    total: data?.total || 0,
    totalPages,
    updateParams,
  };
}
