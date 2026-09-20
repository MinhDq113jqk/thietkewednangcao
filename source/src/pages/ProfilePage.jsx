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
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import {
  useAddressBook,
  usePasswordForm,
  useProfileInfoForm,
} from '../hooks/useProfileForms';

const tabs = [
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
    <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#E6F3F1] text-lg font-bold text-[#0F766E]">
      {initials || 'U'}
    </span>
  );
}

function InfoTab() {
  const { form, handleChange, handleSubmit, loading, user } = useProfileInfoForm();

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-5">
      <div className="flex items-center gap-4 border-b border-[#DDE4E0] pb-6">
        <UserMark name={user?.name} />
        <div className="min-w-0">
          <p className="truncate font-bold text-[#17201D]">{user?.name}</p>
          <p className="mt-1 truncate text-sm text-[#68756F]">{user?.email}</p>
        </div>
      </div>
      <Input name="name" label="Họ và tên" value={form.name} onChange={handleChange} autoComplete="name" />
      <Input name="phone" label="Số điện thoại" value={form.phone} onChange={handleChange} type="tel" autoComplete="tel" />
      <Button type="submit" loading={loading}>Lưu thay đổi</Button>
    </form>
  );
}

function AddressCard({ address, onEdit, onDelete }) {
  const requestDelete = () => {
    if (window.confirm('Xóa địa chỉ giao hàng này?')) onDelete(address.id);
  };

  return (
    <article className="grid gap-3 border-b border-[#DDE4E0] py-5 sm:grid-cols-[1fr_auto]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-[#17201D]">{address.name} · {address.phone}</h3>
          {address.isDefault && (
            <span className="rounded-md bg-[#E6F3F1] px-2 py-1 text-[11px] font-bold text-[#0F766E]">Mặc định</span>
          )}
        </div>
        <p className="mt-2 text-sm leading-6 text-[#68756F]">
          {[address.detail, address.district, address.city].filter(Boolean).join(', ')}
        </p>
      </div>
      <div className="flex items-start gap-1">
        <button type="button" onClick={() => onEdit(address)} className="flex h-9 w-9 items-center justify-center rounded-md text-[#405049] hover:bg-[#EEF2EF]" aria-label="Sửa địa chỉ" title="Sửa địa chỉ">
          <Pencil size={16} aria-hidden />
        </button>
        <button type="button" onClick={requestDelete} className="flex h-9 w-9 items-center justify-center rounded-md text-[#B33625] hover:bg-[#FFF1EE]" aria-label="Xóa địa chỉ" title="Xóa địa chỉ">
          <Trash2 size={16} aria-hidden />
        </button>
      </div>
    </article>
  );
}

function AddressTab() {
  const {
    addresses,
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
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-4 border-b border-[#DDE4E0] pb-4">
        <div>
          <h2 className="font-bold text-[#17201D]">Sổ địa chỉ</h2>
          <p className="mt-1 text-sm text-[#68756F]">Chọn nhanh khi đặt đơn tiếp theo.</p>
        </div>
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus size={16} aria-hidden />
          Thêm địa chỉ
        </Button>
      </div>

      <div aria-busy={isLoading}>
        {isLoading && Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="grid gap-3 border-b border-[#DDE4E0] py-5 sm:grid-cols-[1fr_auto]" aria-hidden="true">
            <div className="space-y-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
        ))}
        {!isLoading && addresses.map((address) => (
          <AddressCard key={address.id} address={address} onEdit={openEdit} onDelete={handleDelete} />
        ))}
        {!isLoading && addresses.length === 0 && (
          <p className="py-10 text-center text-sm text-[#7A8781]">Bạn chưa có địa chỉ giao hàng.</p>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}>
        <div className="space-y-4">
          <Input name="name" label="Tên người nhận" value={form.name} onChange={handleChange} autoComplete="name" />
          <Input name="phone" label="Số điện thoại" value={form.phone} onChange={handleChange} type="tel" autoComplete="tel" />
          <Input name="detail" label="Địa chỉ chi tiết" value={form.detail} onChange={handleChange} autoComplete="street-address" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="district" label="Quận / Huyện" value={form.district} onChange={handleChange} />
            <Input name="city" label="Tỉnh / Thành" value={form.city} onChange={handleChange} />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#596760]">
            <input
              name="isDefault"
              type="checkbox"
              checked={Boolean(form.isDefault)}
              onChange={(event) => handleChange({
                target: { name: 'isDefault', value: event.target.checked },
              })}
              className="h-4 w-4 accent-[#0F766E]"
            />
            Đặt làm địa chỉ mặc định
          </label>
          <Button type="button" onClick={handleSave} loading={isSaving} className="w-full">Lưu địa chỉ</Button>
        </div>
      </Modal>
    </div>
  );
}

function PasswordTab() {
  const { errors, form, handleChange, handleSubmit, loading } = usePasswordForm();

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-5">
      <div className="flex gap-3 border-b border-[#DDE4E0] pb-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E6F3F1] text-[#0F766E]">
          <ShieldCheck size={20} aria-hidden />
        </span>
        <div>
          <h2 className="font-bold text-[#17201D]">Bảo vệ tài khoản</h2>
          <p className="mt-1 text-sm leading-6 text-[#68756F]">Mật khẩu mới cần có ít nhất 8 ký tự.</p>
        </div>
      </div>
      <Input name="current" label="Mật khẩu hiện tại" type="password" value={form.current} error={errors.current} onChange={handleChange} autoComplete="current-password" />
      <Input name="next" label="Mật khẩu mới" type="password" value={form.next} error={errors.next} onChange={handleChange} autoComplete="new-password" />
      <Input name="confirm" label="Xác nhận mật khẩu" type="password" value={form.confirm} error={errors.confirm} onChange={handleChange} autoComplete="new-password" />
      <Button type="submit" loading={loading}>Đổi mật khẩu</Button>
    </form>
  );
}

function ProfilePage() {
  const [activeTab, setActiveTab] = useState('info');
  const content = {
    info: <InfoTab />,
    addresses: <AddressTab />,
    password: <PasswordTab />,
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs font-bold uppercase text-[#0F766E]">Tài khoản</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-[#17201D]">Tài khoản của tôi</h1>

      <div className="mt-8 grid gap-8 md:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-col" aria-label="Thiết lập tài khoản">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex h-11 shrink-0 items-center gap-2 rounded-md px-3 text-left text-sm font-semibold transition ${
                activeTab === id
                  ? 'bg-[#0F766E] text-white'
                  : 'border border-[#DDE4E0] bg-white text-[#405049] hover:border-[#8BC3BD]'
              }`}
              aria-pressed={activeTab === id}
            >
              <Icon size={16} aria-hidden />
              {label}
            </button>
          ))}
        </nav>
        <section className="min-w-0 rounded-lg border border-[#DDE4E0] bg-white p-5 sm:p-7">
          {content[activeTab]}
        </section>
      </div>
    </main>
  );
}

export default ProfilePage;
