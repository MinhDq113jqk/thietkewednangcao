import { Container as BsContainer, Form as BsForm, Button as BsButton } from 'react-bootstrap';
import { useSellerRegister } from '../hooks/useSellerRegister';
import Spinner from '../../../components/ui/Spinner';

function SellerRegister() {
  const { form, handleChange, handleSubmit, registerShop } = useSellerRegister();

  return (
    <BsContainer as="div" className="py-5 booking-compact">
      <BsForm onSubmit={handleSubmit} className="rounded-3 border border-secondary p-4 shadow-sm seller-register-detail-1">
        <h1 className="fs-5 fw-bold text-secondary">Đăng ký gian hàng</h1>
        <p className="mt-1 booking-small text-secondary">Sau khi gửi đăng ký, gian hàng ở trạng thái chờ duyệt.</p>

        <div className="mt-4 d-flex flex-column gap-4">
          <BsForm.Label className="d-flex flex-column gap-1 booking-small text-secondary">
            Tên gian hàng
            <BsForm.Control name="name" value={form.name} onChange={handleChange} required className="rounded-3 border border-secondary px-2 py-3 seller-register-detail-2" />
          </BsForm.Label>
          <BsForm.Label className="d-flex flex-column gap-1 booking-small text-secondary">
            Địa điểm
            <BsForm.Control name="location" value={form.location} onChange={handleChange} className="rounded-3 border border-secondary px-2 py-3 seller-register-detail-3" />
          </BsForm.Label>
          <BsForm.Label className="d-flex flex-column gap-1 booking-small text-secondary">
            Mô tả
            <BsForm.Control as="textarea" name="description" value={form.description} onChange={handleChange} rows={4} className="rounded-3 border border-secondary px-2 py-3 seller-register-detail-4" />
          </BsForm.Label>
        </div>

        <div className="mt-4 d-flex justify-content-end">
          <BsButton variant="primary" type="submit" disabled={registerShop.isPending} aria-busy={registerShop.isPending} className="d-flex align-items-center gap-2 px-3 py-2 booking-small">
            {registerShop.isPending && <Spinner size="sm" label="Đang gửi đăng ký gian hàng..." />}
            {registerShop.isPending ? 'Đang gửi...' : 'Gửi đăng ký'}
          </BsButton>
        </div>
      </BsForm>
    </BsContainer>
  );
}

export default SellerRegister;
