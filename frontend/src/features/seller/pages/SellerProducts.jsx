import { Form as BsForm, Button as BsButton, Table as BsTable } from 'react-bootstrap';
import ListPaging from '../../../components/ui/ListPaging';
import { Link } from 'react-router-dom';
import { Edit, EyeOff, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useSellerProducts } from '../hooks/useSellerProducts';
import Skeleton, { TableSkeleton } from '../../../components/ui/Skeleton';
import Spinner from '../../../components/ui/Spinner';
import ProductMetadata from '../../products/components/ProductMetadata';
import ProductImage from '../../products/components/ProductImage';

const formatPrice = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);

function SellerProducts() {
  const {
    data, page, setPage, refetch,
    categories,
    category,
    filteredProducts,
    handlePermanentDelete,
    hideProduct,
    isError,
    isLoading,
    permanentDeleteProduct,
    restoreProduct,
    search,
    setCategory,
    setSearch,
    setStatus,
    status,
  } = useSellerProducts();

  return (
    <div className="rounded-3 border border-secondary shadow-sm seller-products-detail-1" aria-busy={isLoading}>
      <div className="d-flex flex-column gap-4 border-bottom border-secondary p-4">
        <div className="d-flex flex-column gap-3 flex-md-row align-items-md-center justify-content-md-between">
          <div>
            <h1 className="fs-5 fw-bold text-secondary">Sản phẩm</h1>
            <p className="mt-1 booking-small text-secondary seller-products-detail-2">
              {isLoading
                ? <Skeleton as="span" className="d-inline-block align-middle seller-products-detail-3" />
                : `${filteredProducts.length}/${data?.total || 0} sản phẩm trong gian hàng`}
            </p>
          </div>
          <Link
            to="/seller/products/new"
            className="d-flex align-items-center justify-content-center gap-2 rounded-3 bg-primary px-3 py-2 booking-small fw-medium seller-products-detail-4"
          >
            <Plus size={16} />
            Thêm sản phẩm
          </Link>
        </div>

        <div className="d-grid gap-3 seller-products-detail-5">
          <BsForm.Label className="position-relative d-block">
            <Search className="pe-none position-absolute text-secondary seller-products-detail-6" size={16} />
            <BsForm.Control
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên, mô tả, danh mục"
              className="w-100 rounded-3 border border-secondary py-2 ps-5 pe-2 booking-small seller-products-detail-7"
            />
          </BsForm.Label>

          <BsForm.Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-3 border border-secondary px-2 py-2 booking-small seller-products-detail-8"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang bán</option>
            <option value="hidden">Đã ẩn</option>
          </BsForm.Select>

          <BsForm.Select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-3 border border-secondary px-2 py-2 booking-small seller-products-detail-9"
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </BsForm.Select>
        </div>
      </div>

      {!isError && <div className="px-4"><ListPaging data={data} page={page} onPage={setPage} busy={isLoading} /></div>}
      {isLoading && <div className="overflow-x-auto"><TableSkeleton columns={6} rows={6} className="seller-products-detail-10" /></div>}
      {isError && <p className="p-4 booking-small text-danger">Không thể tải sản phẩm. <BsButton variant="outline-primary" type="submit" onClick={() => refetch()}>Thử lại</BsButton></p>}

      {!isLoading && !isError && (
        <div className="overflow-x-auto">
          <BsTable responsive hover className="w-100 text-start booking-small seller-products-detail-11">
            <thead className="bg-secondary-subtle booking-caption text-uppercase text-secondary">
              <tr>
                <th className="px-4 py-2">Sản phẩm</th>
                <th className="px-4 py-2">Danh mục</th>
                <th className="px-4 py-2">Giá</th>
                <th className="px-4 py-2">Tồn kho</th>
                <th className="px-4 py-2">Trạng thái</th>
                <th className="px-4 py-2 text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody className="seller-products-detail-12">
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="flex-shrink-0 overflow-hidden rounded-3 bg-secondary-subtle seller-products-detail-13">
                        <ProductImage src={product.images?.[0]} alt={product.name} compact />
                      </div>
                      <div>
                        <p className="fw-medium text-secondary">{product.name}</p>
                        <p className="booking-caption text-secondary seller-products-detail-14">{product.description}</p>
                        <ProductMetadata product={product} className="mt-1" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-secondary">{product.category || '-'}</td>
                  <td className="px-4 py-3 fw-medium text-secondary">
                    {formatPrice(product.salePrice || product.price)}
                  </td>
                  <td className="px-4 py-3 text-secondary">{product.stock}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-pill px-2 py-1 booking-caption fw-medium ${product.isActive ? "bg-success-subtle text-success" : "bg-secondary-subtle text-secondary"}`}>
                      {product.isActive ? 'Đang bán' : 'Đã ẩn'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="d-flex justify-content-end gap-2">
                      <Link
                        to={`/seller/products/${product.id}/edit`}
                        className="d-flex align-items-center justify-content-center rounded-3 border border-secondary text-secondary seller-products-detail-15"
                        aria-label="Sửa sản phẩm"
                      >
                        <Edit size={16} />
                      </Link>
                      {product.isActive && (
                          <BsButton variant="outline-danger" type="submit"
                            onClick={() => hideProduct.mutate(product.id)}
                            disabled={hideProduct.isPending}
                            aria-busy={hideProduct.isPending && hideProduct.variables === product.id}
                            className="d-flex align-items-center justify-content-center seller-products-detail-16"
                          title="Ẩn bán sản phẩm"
                          aria-label="Ẩn bán sản phẩm"
                        >
                            {hideProduct.isPending && hideProduct.variables === product.id
                              ? <Spinner size="sm" label="Đang ẩn sản phẩm..." />
                              : <EyeOff size={16} aria-hidden />}
                        </BsButton>
                      )}
                      {!product.isActive && (
                        <>
                          <BsButton variant="outline-primary" type="submit"
                            onClick={() => restoreProduct.mutate(product.id)}
                            disabled={restoreProduct.isPending}
                            aria-busy={restoreProduct.isPending && restoreProduct.variables === product.id}
                            className="d-flex align-items-center justify-content-center text-success seller-products-detail-17"
                            title="Khôi phục bán lại"
                            aria-label="Khôi phục bán lại"
                          >
                            {restoreProduct.isPending && restoreProduct.variables === product.id
                              ? <Spinner size="sm" label="Đang khôi phục sản phẩm..." />
                              : <RotateCcw size={16} aria-hidden />}
                          </BsButton>
                          <BsButton variant="outline-danger" type="submit"
                            onClick={() => handlePermanentDelete(product)}
                            disabled={!product.canDeletePermanently || permanentDeleteProduct.isPending}
                            aria-busy={permanentDeleteProduct.isPending && permanentDeleteProduct.variables === product.id}
                            className="d-flex align-items-center justify-content-center seller-products-detail-18"
                            title={product.canDeletePermanently ? 'Xóa vĩnh viễn' : 'Không thể xóa vì sản phẩm đã có đơn hàng hoặc đánh giá'}
                            aria-label={product.canDeletePermanently ? 'Xóa vĩnh viễn' : 'Không thể xóa vì sản phẩm đã có đơn hàng hoặc đánh giá'}
                          >
                            {permanentDeleteProduct.isPending && permanentDeleteProduct.variables === product.id
                              ? <Spinner size="sm" label="Đang xóa sản phẩm..." />
                              : <Trash2 size={16} aria-hidden />}
                          </BsButton>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </BsTable>
          {!filteredProducts.length && (
            <p className="p-4 text-center booking-small text-secondary">Không có sản phẩm phù hợp.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default SellerProducts;
