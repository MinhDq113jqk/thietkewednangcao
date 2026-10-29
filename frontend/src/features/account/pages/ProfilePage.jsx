import { Form as BsForm, Button as BsButton, Container as BsContainer } from 'react-bootstrap';
import BsGrid from '../../home/components/ResponsiveGrid';
import AccountSecurity from '../components/AccountSecurity';
import { useState } from 'react';
import {
  KeyRound,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Skeleton from '../../../components/ui/Skeleton';
import {
  useAddressBook,
  usePasswordForm,
  useProfileInfoForm,
} from '../hooks/useProfileForms';

const tabs = [
  { id: 'security', label: 'Email và phiên đăng nhập', icon: ShieldCheck },
  { id: 'info', label: 'Thông tin cá nhân', icon: UserRound },
  { id: 'addresses', label: 'Địa chỉ giao hàng', icon: MapPin },
  { id: 'password', label: 'Đổi mật khẩu', icon: KeyRound },
];

function UserMark({ name }) {
  const initials = String(name || 'U')
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();

  return (
    <span className="d-flex align-items-center justify-content-center rounded-3 bg-primary-subtle fs-5 fw-bold text-primary profile-page-detail-1">
      {initials || 'U'}
    </span>
  );
}

function InfoTab() {
  const { form, handleChange, handleSubmit, loading, user } = useProfileInfoForm();

  return (
    <BsForm onSubmit={handleSubmit} className="profile-page-detail-2">
      <div className="d-flex align-items-center gap-4 border-bottom pb-4 profile-page-detail-3">
        <UserMark name={user?.name} />
        <div className="profile-page-detail-4">
          <p className="text-truncate fw-bold text-dark">{user?.name}</p>
          <p className="mt-1 text-truncate booking-small text-secondary">{user?.email}</p>
        </div>
      </div>
      <Input name="name" label="Họ và tên" value={form.name} onChange={handleChange} autoComplete="name" />
      <Input name="phone" label="Số điện thoại" value={form.phone} onChange={handleChange} type="tel" autoComplete="tel" />
      <Button type="submit" loading={loading}>Lưu thay đổi</Button>
    </BsForm>
  );
}

function AddressCard({ address, onEdit, onDelete }) {
  const requestDelete = () => {
    if (window.confirm('Xóa địa chỉ giao hàng này?')) onDelete(address.id);
  };

  return (
    <article className="d-grid gap-3 border-bottom py-4 profile-page-detail-5">
      <div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <h3 className="fw-bold text-dark">{address.name} · {address.phone}</h3>
          {address.isDefault && (
            <span className="rounded-2 bg-primary-subtle px-2 py-1 fw-bold text-primary profile-page-detail-6">Mặc định</span>
          )}
        </div>
        <p className="mt-2 booking-small text-secondary profile-page-detail-7">
          {[address.detail, address.district, address.city].filter(Boolean).join(', ')}
        </p>
      </div>
      <div className="d-flex align-items-start gap-1">
        <BsButton variant="outline-primary" type="button" onClick={() => onEdit(address)} className="d-flex align-items-center justify-content-center profile-page-detail-8" aria-label="Sửa địa chỉ" title="Sửa địa chỉ">
          <Pencil size={16} aria-hidden />
        </BsButton>
        <BsButton variant="outline-danger" type="button" onClick={requestDelete} className="d-flex align-items-center justify-content-center profile-page-detail-9" aria-label="Xóa địa chỉ" title="Xóa địa chỉ">
          <Trash2 size={16} aria-hidden />
        </BsButton>
      </div>
    </article>
  );
}

function AddressTab() {
  const {
    addresses,
    errors,
    isError,
    editTarget,
    form,
    handleChange,
    handleDelete,
    handleSave,
    isLoading,
    isSaving,
    modalOpen,
    openAdd,
    openEdit,
    setModalOpen,
  } = useAddressBook();

  return (
    <div className="profile-page-detail-10">
      <div className="d-flex align-items-center justify-content-between gap-4 border-bottom pb-3 profile-page-detail-11">
        <div>
          <h2 className="fw-bold text-dark">Sổ địa chỉ</h2>
          <p className="mt-1 booking-small text-secondary">Chọn nhanh khi đặt đơn tiếp theo.</p>
        </div>
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus size={16} aria-hidden />
          Thêm địa chỉ
        </Button>
      </div>

      <p className="mt-2 booking-caption text-secondary">Địa chỉ đầu tiên tự làm mặc định. Chọn địa chỉ khác để thay đổi; xóa mặc định sẽ chọn địa chỉ còn lại.</p>
      {isError && <p role="alert" className="mt-2 booking-small text-danger">Không thể tải sổ địa chỉ.</p>}
      <div aria-busy={isLoading}>
        {isLoading && Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="d-grid gap-3 border-bottom py-4 profile-page-detail-12" aria-hidden="true">
            <div className="profile-page-detail-13">
              <Skeleton className="profile-page-detail-14" />
              <Skeleton className="profile-page-detail-15" />
            </div>
            <Skeleton className="profile-page-detail-16" />
          </div>
        ))}
        {!isLoading && addresses.map((address) => (
          <AddressCard key={address.id} address={address} onEdit={openEdit} onDelete={handleDelete} />
        ))}
        {!isLoading && !isError && addresses.length === 0 && (
          <p className="py-5 text-center booking-small text-secondary">Bạn chưa có địa chỉ giao hàng.</p>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}>
        <div className="profile-page-detail-17">
          <Input name="name" label="Tên người nhận" value={form.name} error={errors.name} onChange={handleChange} autoComplete="name" />
          <Input name="phone" label="Số điện thoại" value={form.phone} error={errors.phone} onChange={handleChange} type="tel" autoComplete="tel" />
          <Input name="detail" label="Địa chỉ chi tiết" value={form.detail} error={errors.detail} onChange={handleChange} autoComplete="street-address" />
          <BsGrid as="div" columns={{"xs":1,"sm":2}} className="">
            <Input name="district" label="Quận / Huyện" value={form.district} error={errors.district} onChange={handleChange} />
            <Input name="city" label="Tỉnh / Thành" value={form.city} error={errors.city} onChange={handleChange} />
          </BsGrid>
          <BsForm.Label className="d-flex align-items-center gap-2 booking-small fw-medium text-secondary">
            <BsForm.Check.Input
              name="isDefault"
              type="checkbox"
              checked={Boolean(form.isDefault)}
              onChange={(event) => handleChange({
                target: { name: 'isDefault', value: event.target.checked },
              })}
              className="profile-page-detail-18"
            />
            Đặt làm địa chỉ mặc định
          </BsForm.Label>
          <Button type="button" onClick={handleSave} loading={isSaving} className="w-100">Lưu địa chỉ</Button>
        </div>
      </Modal>
    </div>
  );
}

function PasswordTab() {
  const { errors, form, handleChange, handleSubmit, loading } = usePasswordForm();

  return (
    <BsForm onSubmit={handleSubmit} className="profile-page-detail-19">
      <div className="d-flex gap-3 border-bottom pb-4 profile-page-detail-20">
        <span className="d-flex flex-shrink-0 align-items-center justify-content-center rounded-3 bg-primary-subtle text-primary profile-page-detail-21">
          <ShieldCheck size={20} aria-hidden />
        </span>
        <div>
          <h2 className="fw-bold text-dark">Bảo vệ tài khoản</h2>
          <p className="mt-1 booking-small text-secondary profile-page-detail-22">Mật khẩu mới cần có ít nhất 8 ký tự.</p>
        </div>
      </div>
      <Input name="current" label="Mật khẩu hiện tại" type="password" value={form.current} error={errors.current} onChange={handleChange} autoComplete="current-password" />
      <Input name="next" label="Mật khẩu mới" type="password" value={form.next} error={errors.next} onChange={handleChange} autoComplete="new-password" />
      <Input name="confirm" label="Xác nhận mật khẩu" type="password" value={form.confirm} error={errors.confirm} onChange={handleChange} autoComplete="new-password" />
      <Button type="submit" loading={loading}>Đổi mật khẩu</Button>
    </BsForm>
  );
}

function ProfilePage() {
  const [activeTab, setActiveTab] = useState('info');
  const content = {
    info: <InfoTab />,
    security: <AccountSecurity />,
    addresses: <AddressTab />,
    password: <PasswordTab />,
  };

  return (
    <BsContainer as="main" className="py-5 booking-narrow">
      <p className="booking-caption fw-bold text-uppercase text-primary">Tài khoản</p>
      <h1 className="mt-2 booking-title fs-3 fw-semibold text-dark">Tài khoản của tôi</h1>

      <div className="booking-account-layout mt-4">
        <nav className="d-flex gap-2 overflow-x-auto pb-1 flex-md-column" aria-label="Thiết lập tài khoản">
          {tabs.map(({ id, label, icon: Icon }) => (
            <BsButton variant="outline-primary"
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`d-flex flex-shrink-0 align-items-center gap-2 rounded-2 px-2 text-start booking-small fw-semibold profile-page-detail-25 ${
                activeTab === id
                  ? "bg-primary profile-page-detail-23"
                  : "border text-body profile-page-detail-24"
              }`}
              aria-pressed={activeTab === id}
            >
              <Icon size={16} aria-hidden />
              {label}
            </BsButton>
          ))}
        </nav>
        <section className="rounded-3 border p-4 p-sm-5 profile-page-detail-26">
          {content[activeTab]}
        </section>
      </div>
    </BsContainer>
  );
}

export default ProfilePage;
