import { Upload } from 'lucide-react';
import { sellerProductCategories } from '../../hooks/sellerProductForm.helpers';
import { useSellerProductForm } from '../../hooks/useSellerProductForm';
import { FormSkeleton } from '../../components/ui/Skeleton';
import Spinner from '../../components/ui/Spinner';

function SellerProductForm() {
  const {
    cancel,
    handleSubmit,
    handleUpload,
    isEdit,
    isLoading,
    product,
    saveProduct,
    uploadImage,
  } = useSellerProductForm();

  if (isEdit && isLoading) return <div aria-busy="true"><FormSkeleton fields={7} /></div>;
  if (isEdit && !product) return <p className="text-sm text-red-400">Không tìm thấy sản phẩm.</p>;

  return (
    <form key={product?.id || 'new'} onSubmit={handleSubmit} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h1 className="mb-5 text-xl font-bold text-gray-800">{isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Tên sản phẩm
          <input name="name" defaultValue={product?.name || ''} required className="rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-400" />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Danh mục
          <select name="category" defaultValue={product?.category || 'Móc khóa'} className="rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-400">
            {sellerProductCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Giá
          <input name="price" defaultValue={product?.price || ''} required inputMode="numeric" className="rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-400" />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Giá khuyến mãi
          <input name="salePrice" defaultValue={product?.salePrice || ''} inputMode="numeric" className="rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-400" />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Tồn kho
          <input name="stock" defaultValue={product?.stock || ''} required inputMode="numeric" className="rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-400" />
        </label>

        <div className="flex flex-col gap-1 text-sm text-gray-600">
          Ảnh sản phẩm
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input name="image" defaultValue={product?.images?.[0] || ''} placeholder="URL ảnh hoặc tải file lên" className="rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-400" />
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" aria-busy={uploadImage.isPending}>
              {uploadImage.isPending
                ? <Spinner size="sm" label="Đang tải ảnh sản phẩm..." />
                : <Upload size={16} aria-hidden />}
              {uploadImage.isPending ? 'Đang tải...' : 'Tải ảnh'}
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploadImage.isPending} />
            </label>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm text-gray-600 md:col-span-2">
          Mô tả
          <textarea name="description" defaultValue={product?.description || ''} rows={4} className="resize-none rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-400" />
        </label>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={cancel} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
          Hủy
        </button>
        <button disabled={saveProduct.isPending || uploadImage.isPending} aria-busy={saveProduct.isPending} className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:bg-gray-300">
          {saveProduct.isPending && <Spinner size="sm" label="Đang lưu sản phẩm..." />}
          {saveProduct.isPending ? 'Đang lưu...' : 'Lưu sản phẩm'}
        </button>
      </div>
    </form>
  );
}

export default SellerProductForm;
