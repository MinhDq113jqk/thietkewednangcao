import { Form as BsForm, Button as BsButton } from 'react-bootstrap';
import BsGrid from '../../home/components/ResponsiveGrid';
import { Upload } from 'lucide-react';
import { useSellerShopSettings } from '../hooks/useSellerShopSettings';
import { FormSkeleton } from '../../../components/ui/Skeleton';
import Spinner from '../../../components/ui/Spinner';

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
      <div className="rounded-3 border border-warning bg-warning-subtle p-4">
        <h1 className="fs-5 fw-bold text-secondary">Chưa có gian hàng</h1>
        <p className="mt-1 booking-small text-secondary">Vào trang đăng ký gian hàng để tạo hồ sơ bán hàng.</p>
      </div>
    );
  }

  return (
    <BsForm key={shop.id} onSubmit={handleSubmit} className="rounded-3 border border-secondary p-4 shadow-sm seller-shop-settings-detail-1" aria-busy={updateShop.isPending || uploadImage.isPending}>
      <div className="mb-4">
        <h1 className="fs-5 fw-bold text-secondary">Cài đặt gian hàng</h1>
        <p className="mt-1 booking-small text-secondary">Trạng thái: {shop.status}</p>
      </div>

      <BsGrid as="div" columns={{"xs":1,"md":2}} className="">
        <BsForm.Label className="d-flex flex-column gap-1 booking-small text-secondary">
          Tên gian hàng
          <BsForm.Control name="name" defaultValue={shop.name || ''} required className="rounded-3 border border-secondary px-2 py-3 seller-shop-settings-detail-2" />
        </BsForm.Label>

        <BsForm.Label className="d-flex flex-column gap-1 booking-small text-secondary">
          Địa điểm
          <BsForm.Control name="location" defaultValue={shop.location || ''} className="rounded-3 border border-secondary px-2 py-3 seller-shop-settings-detail-3" />
        </BsForm.Label>

        <div className="d-flex flex-column gap-1 booking-small text-secondary">
          Logo gian hàng
          <div className="d-grid gap-2 seller-shop-settings-detail-4">
            <BsForm.Control name="logo" defaultValue={shop.logo || ''} placeholder="URL logo hoặc tải file lên" className="rounded-3 border border-secondary px-2 py-3 seller-shop-settings-detail-5" />
            <BsForm.Label className="d-flex align-items-center justify-content-center gap-2 rounded-3 border border-secondary px-3 py-3 booking-small fw-medium text-secondary seller-shop-settings-detail-6" aria-busy={uploadImage.isPending}>
              {uploadImage.isPending ? <Spinner size="sm" label="Đang tải ảnh gian hàng..." /> : <Upload size={16} aria-hidden />}
              {uploadImage.isPending ? 'Đang tải...' : 'Tải logo'}
              <BsForm.Control type="file" accept="image/*" className="d-none" onChange={(event) => handleUpload(event, 'logo')} disabled={uploadImage.isPending} />
            </BsForm.Label>
          </div>
        </div>

        <div className="d-flex flex-column gap-1 booking-small text-secondary">
          Banner gian hàng
          <div className="d-grid gap-2 seller-shop-settings-detail-7">
            <BsForm.Control name="banner" defaultValue={shop.banner || ''} placeholder="URL banner hoặc tải file lên" className="rounded-3 border border-secondary px-2 py-3 seller-shop-settings-detail-8" />
            <BsForm.Label className="d-flex align-items-center justify-content-center gap-2 rounded-3 border border-secondary px-3 py-3 booking-small fw-medium text-secondary seller-shop-settings-detail-9" aria-busy={uploadImage.isPending}>
              {uploadImage.isPending ? <Spinner size="sm" label="Đang tải ảnh gian hàng..." /> : <Upload size={16} aria-hidden />}
              {uploadImage.isPending ? 'Đang tải...' : 'Tải banner'}
              <BsForm.Control type="file" accept="image/*" className="d-none" onChange={(event) => handleUpload(event, 'banner')} disabled={uploadImage.isPending} />
            </BsForm.Label>
          </div>
        </div>

        <BsForm.Label className="d-flex flex-column gap-1 booking-small text-secondary layout-span-md-2 seller-shop-settings-detail-10">
          Mô tả
          <BsForm.Control as="textarea" name="description" defaultValue={shop.description || ''} rows={4} className="rounded-3 border border-secondary px-2 py-3 seller-shop-settings-detail-11" />
        </BsForm.Label>
      </BsGrid>

      <div className="mt-4 d-flex justify-content-end">
        <BsButton variant="primary" type="submit" disabled={updateShop.isPending || uploadImage.isPending} aria-busy={updateShop.isPending} className="d-flex align-items-center gap-2 px-3 py-2 booking-small">
          {updateShop.isPending && <Spinner size="sm" label="Đang lưu thay đổi gian hàng..." />}
          {updateShop.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
        </BsButton>
      </div>
    </BsForm>
  );
}

export default SellerShopSettings;
