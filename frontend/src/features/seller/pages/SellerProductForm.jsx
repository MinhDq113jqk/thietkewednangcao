import { Button as BsButton, Form as BsForm } from 'react-bootstrap';
import BsGrid from '../../home/components/ResponsiveGrid';
import SellerVariants from '../../products/components/SellerVariants';
import ProductImagesEditor from '../../products/components/ProductImagesEditor';
import { sellerProductCategories } from '../hooks/sellerProductForm.helpers';
import { useSellerProductForm } from '../hooks/useSellerProductForm';
import { FormSkeleton } from '../../../components/ui/Skeleton';
import Spinner from '../../../components/ui/Spinner';
import ProductMetadata from '../../products/components/ProductMetadata';
import ProductStockEditor from '../../products/components/ProductStockEditor';
import { isKnownCategory, normalizeCategory } from '../../../../../backend/src/shared/productCatalog.mjs';

function SellerProductForm() {
  const {
    cancel,
    handleSubmit,
    handleUpload,
    isEdit,
    isLoading,
    isError,
    reloadProduct,
    product,
    saveProduct,
    uploadImage,
    errors,
    images,
    setImages,
  } = useSellerProductForm();

  if (isEdit && isLoading) return <div aria-busy="true"><FormSkeleton fields={7} /></div>;
  if (isEdit && isError) return <p role="alert">Không thể tải sản phẩm. <BsButton variant="outline-primary" type="submit" className="text-decoration-underline" onClick={() => { void reloadProduct().catch(() => {}); }}>Thử lại</BsButton></p>;
  if (isEdit && !product) return <p className="booking-small text-danger">Không tìm thấy sản phẩm.</p>;
  const currentCategory = normalizeCategory(product?.category);
  const fieldProps = (name) => ({ id: `product-${name}`, 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `product-${name}-error` : undefined });
  const fieldError = (name) => errors[name] ? <span id={`product-${name}-error`} role="alert" className="booking-caption text-danger">{errors[name]}</span> : null;

  return (
    <div className="seller-product-form-detail-1"><BsForm key={product?.id || 'new'} noValidate onSubmit={handleSubmit} className="rounded-3 border border-secondary p-4 shadow-sm seller-product-form-detail-2">
      <h1 className="mb-4 fs-5 fw-bold text-secondary">{isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h1>
      {product && <ProductMetadata product={product} className="mb-3" />}
      <p className="mb-3 booking-caption text-secondary seller-product-form-detail-3">Sản phẩm mới được ghi nhận là dữ liệu người bán nhập. Nhãn nguồn của sản phẩm mẫu được giữ khi chỉnh sửa.</p>

      <BsGrid as="div" columns={{"xs":1,"md":2}} className="">
        <BsForm.Label className="d-flex flex-column gap-1 booking-small text-secondary">
          Tên sản phẩm
          <BsForm.Control {...fieldProps('name')} name="name" defaultValue={product?.name || ''} required className="rounded-3 border border-secondary px-2 py-3 seller-product-form-detail-4" />
          {fieldError('name')}
        </BsForm.Label>

        <BsForm.Label className="d-flex flex-column gap-1 booking-small text-secondary">
          Danh mục
          <BsForm.Select {...fieldProps('category')} name="category" defaultValue={isEdit ? currentCategory : 'Móc khóa'} required className="rounded-3 border border-secondary px-2 py-3 seller-product-form-detail-5">
            <option value="" disabled>Chọn danh mục</option>
            {currentCategory && !isKnownCategory(currentCategory) && (
              <option value={currentCategory}>Danh mục cũ: {currentCategory}</option>
            )}
            {sellerProductCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </BsForm.Select>
          {fieldError('category')}
        </BsForm.Label>

        <BsForm.Label className="d-flex flex-column gap-1 booking-small text-secondary">
          Giá
          <BsForm.Control readOnly={isEdit && product?.variantCount !== 1} {...fieldProps('price')} name="price" defaultValue={product?.price ?? ''} required inputMode="numeric" className="rounded-3 border border-secondary px-2 py-3 seller-product-form-detail-6" />
          {fieldError('price')}
        </BsForm.Label>

        <BsForm.Label className="d-flex flex-column gap-1 booking-small text-secondary">
          Giá khuyến mãi
          <BsForm.Control readOnly={isEdit && product?.variantCount !== 1} {...fieldProps('salePrice')} name="salePrice" defaultValue={product?.salePrice ?? ''} inputMode="numeric" className="rounded-3 border border-secondary px-2 py-3 seller-product-form-detail-7" />
          {fieldError('salePrice')}
        </BsForm.Label>

        {!isEdit && <BsForm.Label className="d-flex flex-column gap-1 booking-small text-secondary">
          Tồn kho
          <BsForm.Control {...fieldProps('stock')} name="stock" defaultValue={product?.stock ?? ''} required inputMode="numeric" className="rounded-3 border border-secondary px-2 py-3 seller-product-form-detail-8" />
          {fieldError('stock')}
        </BsForm.Label>}

        <ProductImagesEditor images={images} onChange={setImages} onUpload={handleUpload} uploading={uploadImage.isPending} error={errors.images} />

        <BsForm.Label className="d-flex flex-column gap-1 booking-small text-secondary layout-span-md-2 seller-product-form-detail-9">
          Mô tả
          <BsForm.Control as="textarea" {...fieldProps('description')} name="description" defaultValue={product?.description || ''} rows={4} className="rounded-3 border border-secondary px-2 py-3 seller-product-form-detail-10" />
          {fieldError('description')}
        </BsForm.Label>
      </BsGrid>

      <div className="mt-4 d-flex justify-content-end gap-3">
        <BsButton variant="outline-primary" type="button" onClick={cancel} className="px-3 py-2 booking-small">
          Hủy
        </BsButton>
        <BsButton variant="primary" type="submit" disabled={saveProduct.isPending || uploadImage.isPending} aria-busy={saveProduct.isPending} className="d-flex align-items-center gap-2 px-3 py-2 booking-small">
          {saveProduct.isPending && <Spinner size="sm" label="Đang lưu sản phẩm..." />}
          {saveProduct.isPending ? 'Đang lưu...' : 'Lưu sản phẩm'}
        </BsButton>
      </div>
    </BsForm>{isEdit && <SellerVariants product={product} reloadProduct={reloadProduct} />}{isEdit && product.variants?.length === 1 && <ProductStockEditor key={product.id} product={product} reloadProduct={reloadProduct} />}</div>
  );
}

export default SellerProductForm;
