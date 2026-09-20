import { Upload } from 'lucide-react';
import { useSellerShopSettings } from '../../hooks/useSellerShopSettings';
import { FormSkeleton } from '../../components/ui/Skeleton';
import Spinner from '../../components/ui/Spinner';

function SellerShopSettings() {
  const {
    handleSubmit,
    handleUpload,
    isError,
    isLoading,
    shop,
    updateShop,
    uploadImage,
  } = useSellerShopSettings();

  if (isLoading) return <div aria-busy="true"><FormSkeleton fields={5} /></div>;

  if (isError) {
    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50 p-5">
        <h1 className="text-lg font-bold text-gray-800">Chưa có gian hàng</h1>
        <p className="mt-1 text-sm text-gray-600">Vào trang đăng ký gian hàng để tạo hồ sơ bán hàng.</p>
      </div>
    );
  }

  return (
    <form key={shop.id} onSubmit={handleSubmit} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm" aria-busy={updateShop.isPending || uploadImage.isPending}>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-800">Cài đặt gian hàng</h1>
        <p className="mt-1 text-sm text-gray-500">Trạng thái: {shop.status}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Tên gian hàng
          <input name="name" defaultValue={shop.name || ''} required className="rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-400" />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Địa điểm
          <input name="location" defaultValue={shop.location || ''} className="rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-400" />
        </label>

        <div className="flex flex-col gap-1 text-sm text-gray-600">
          Logo gian hàng
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input name="logo" defaultValue={shop.logo || ''} placeholder="URL logo hoặc tải file lên" className="rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-400" />
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" aria-busy={uploadImage.isPending}>
              {uploadImage.isPending ? <Spinner size="sm" label="Đang tải ảnh gian hàng..." /> : <Upload size={16} aria-hidden />}
              {uploadImage.isPending ? 'Đang tải...' : 'Tải logo'}
              <input type="file" accept="image/*" className="hidden" onChange={(event) => handleUpload(event, 'logo')} disabled={uploadImage.isPending} />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-1 text-sm text-gray-600">
          Banner gian hàng
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input name="banner" defaultValue={shop.banner || ''} placeholder="URL banner hoặc tải file lên" className="rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-400" />
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" aria-busy={uploadImage.isPending}>
              {uploadImage.isPending ? <Spinner size="sm" label="Đang tải ảnh gian hàng..." /> : <Upload size={16} aria-hidden />}
              {uploadImage.isPending ? 'Đang tải...' : 'Tải banner'}
              <input type="file" accept="image/*" className="hidden" onChange={(event) => handleUpload(event, 'banner')} disabled={uploadImage.isPending} />
            </label>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm text-gray-600 md:col-span-2">
          Mô tả
          <textarea name="description" defaultValue={shop.description || ''} rows={4} className="resize-none rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-400" />
        </label>
      </div>

      <div className="mt-5 flex justify-end">
        <button disabled={updateShop.isPending || uploadImage.isPending} aria-busy={updateShop.isPending} className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:bg-gray-300">
          {updateShop.isPending && <Spinner size="sm" label="Đang lưu thay đổi gian hàng..." />}
          {updateShop.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  );
}

export default SellerShopSettings;
