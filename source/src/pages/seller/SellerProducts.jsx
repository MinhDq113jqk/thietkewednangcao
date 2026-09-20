import { Link } from 'react-router-dom';
import { Edit, EyeOff, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useSellerProducts } from '../../hooks/useSellerProducts';
import Skeleton, { TableSkeleton } from '../../components/ui/Skeleton';
import Spinner from '../../components/ui/Spinner';

const formatPrice = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);

function SellerProducts() {
  const {
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
  } = useSellerProducts();

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm" aria-busy={isLoading}>
      <div className="flex flex-col gap-4 border-b border-gray-100 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Sản phẩm</h1>
            <p className="mt-1 min-h-5 text-sm text-gray-500">
              {isLoading
                ? <Skeleton as="span" className="inline-block h-4 w-44 align-middle" />
                : `${filteredProducts.length}/${products.length} sản phẩm trong gian hàng`}
            </p>
          </div>
          <Link
            to="/seller/products/new"
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            <Plus size={16} />
            Thêm sản phẩm
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên, mô tả, danh mục"
              className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-amber-400"
            />
          </label>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang bán</option>
            <option value="hidden">Đã ẩn</option>
          </select>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <div className="overflow-x-auto"><TableSkeleton columns={6} rows={6} className="min-w-[760px]" /></div>}
      {isError && <p className="p-5 text-sm text-red-400">Không thể tải sản phẩm.</p>}

      {!isLoading && !isError && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-400">
              <tr>
                <th className="px-5 py-3">Sản phẩm</th>
                <th className="px-5 py-3">Danh mục</th>
                <th className="px-5 py-3">Giá</th>
                <th className="px-5 py-3">Tồn kho</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.images?.[0] || 'https://placehold.co/80x80?text=SP'}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                      <div>
                        <p className="font-medium text-gray-800">{product.name}</p>
                        <p className="line-clamp-1 text-xs text-gray-400">{product.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{product.category || '-'}</td>
                  <td className="px-5 py-4 font-medium text-gray-700">
                    {formatPrice(product.salePrice || product.price)}
                  </td>
                  <td className="px-5 py-4 text-gray-600">{product.stock}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${product.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      {product.isActive ? 'Đang bán' : 'Đã ẩn'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/seller/products/${product.id}/edit`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                        aria-label="Sửa sản phẩm"
                      >
                        <Edit size={16} />
                      </Link>
                      {product.isActive && (
                          <button
                            onClick={() => hideProduct.mutate(product.id)}
                            disabled={hideProduct.isPending}
                            aria-busy={hideProduct.isPending && hideProduct.variables === product.id}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-500 hover:bg-red-50"
                          title="Ẩn bán sản phẩm"
                          aria-label="Ẩn bán sản phẩm"
                        >
                            {hideProduct.isPending && hideProduct.variables === product.id
                              ? <Spinner size="sm" label="Đang ẩn sản phẩm..." />
                              : <EyeOff size={16} aria-hidden />}
                        </button>
                      )}
                      {!product.isActive && (
                        <>
                          <button
                            onClick={() => restoreProduct.mutate(product.id)}
                            disabled={restoreProduct.isPending}
                            aria-busy={restoreProduct.isPending && restoreProduct.variables === product.id}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-green-100 text-green-600 hover:bg-green-50"
                            title="Khôi phục bán lại"
                            aria-label="Khôi phục bán lại"
                          >
                            {restoreProduct.isPending && restoreProduct.variables === product.id
                              ? <Spinner size="sm" label="Đang khôi phục sản phẩm..." />
                              : <RotateCcw size={16} aria-hidden />}
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(product)}
                            disabled={!product.canDeletePermanently || permanentDeleteProduct.isPending}
                            aria-busy={permanentDeleteProduct.isPending && permanentDeleteProduct.variables === product.id}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-300 disabled:hover:bg-white"
                            title={product.canDeletePermanently ? 'Xóa vĩnh viễn' : 'Không thể xóa vì sản phẩm đã có đơn hàng hoặc đánh giá'}
                            aria-label={product.canDeletePermanently ? 'Xóa vĩnh viễn' : 'Không thể xóa vì sản phẩm đã có đơn hàng hoặc đánh giá'}
                          >
                            {permanentDeleteProduct.isPending && permanentDeleteProduct.variables === product.id
                              ? <Spinner size="sm" label="Đang xóa sản phẩm..." />
                              : <Trash2 size={16} aria-hidden />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredProducts.length && (
            <p className="p-5 text-center text-sm text-gray-400">Không có sản phẩm phù hợp.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default SellerProducts;
