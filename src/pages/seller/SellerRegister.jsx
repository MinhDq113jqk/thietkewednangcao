import { useSellerRegister } from '../../hooks/useSellerRegister';
import Spinner from '../../components/ui/Spinner';

function SellerRegister() {
  const { form, handleChange, handleSubmit, registerShop } = useSellerRegister();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">Đăng ký gian hàng</h1>
        <p className="mt-1 text-sm text-gray-500">Sau khi gửi đăng ký, gian hàng ở trạng thái chờ duyệt.</p>

        <div className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Tên gian hàng
            <input name="name" value={form.name} onChange={handleChange} required className="rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Địa điểm
            <input name="location" value={form.location} onChange={handleChange} className="rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-400" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Mô tả
            <textarea name="description" value={form.description} onChange={handleChange} rows={4} className="resize-none rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-400" />
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <button disabled={registerShop.isPending} aria-busy={registerShop.isPending} className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:bg-gray-300">
            {registerShop.isPending && <Spinner size="sm" label="Đang gửi đăng ký gian hàng..." />}
            {registerShop.isPending ? 'Đang gửi...' : 'Gửi đăng ký'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SellerRegister;
