import { useState } from 'react';
import {
  BadgeCheck,
  Compass,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLoginForm } from '../hooks/useLoginForm';
import Spinner from '../components/ui/Spinner';

function LoginPage() {
  const {
    error,
    form,
    handleChange,
    handleSubmit,
    isLogin,
    loading,
    setIsLogin,
  } = useLoginForm();
  const [showPassword, setShowPassword] = useState(false);

  const switchMode = (nextIsLogin) => {
    setIsLogin(nextIsLogin);
    setShowPassword(false);
  };

  return (
    <main className="mx-auto grid min-h-[640px] max-w-5xl items-stretch px-4 py-10 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden rounded-l-lg bg-[#0F766E] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F2C14E] text-[#17201D]">
              <Compass size={22} aria-hidden />
            </span>
            <span className="font-display text-xl font-bold">SouvenirShop</span>
          </Link>
          <h1 className="mt-16 font-display text-4xl font-semibold leading-tight">
            Mỗi món quà có một nơi để trở về.
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#D5F1ED]">
            Lưu đơn hàng, theo dõi vị trí vận chuyển và nhận gợi ý phù hợp hơn trong những lần ghé sau.
          </p>
        </div>
        <div className="space-y-4 text-sm text-[#E1F7F4]">
          <p className="flex items-center gap-3"><ShieldCheck size={18} className="text-[#F2C14E]" />Phiên đăng nhập được bảo vệ</p>
          <p className="flex items-center gap-3"><BadgeCheck size={18} className="text-[#F2C14E]" />Thông tin tài khoản được xử lý riêng tư</p>
        </div>
      </section>

      <section className="rounded-lg border border-[#DDE4E0] bg-white p-6 sm:p-10 lg:rounded-l-none">
        <div className="mx-auto max-w-md">
          <p className="text-xs font-bold uppercase text-[#0F766E]">Tài khoản SouvenirShop</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-[#17201D]">
            {isLogin ? 'Chào mừng bạn trở lại' : 'Tạo tài khoản mới'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#68756F]">
            {isLogin ? 'Tiếp tục hành trình tìm quà Việt của bạn.' : 'Một tài khoản cho mua sắm, theo dõi đơn và mở gian hàng.'}
          </p>

          <div className="mt-7 grid grid-cols-2 rounded-lg bg-[#F0F3F1] p-1" role="tablist">
            <button
              type="button"
              onClick={() => switchMode(true)}
              className={`h-10 rounded-md text-sm font-bold transition ${isLogin ? 'bg-white text-[#0F766E] shadow-sm' : 'text-[#68756F]'}`}
              role="tab"
              aria-selected={isLogin}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => switchMode(false)}
              className={`h-10 rounded-md text-sm font-bold transition ${!isLogin ? 'bg-white text-[#0F766E] shadow-sm' : 'text-[#68756F]'}`}
              role="tab"
              aria-selected={!isLogin}
            >
              Đăng ký
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {!isLogin && (
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-[#405049]">Họ và tên</span>
                <span className="flex h-11 items-center gap-2 rounded-lg border border-[#D5DEDA] px-3 focus-within:border-[#0F766E]">
                  <UserRound size={17} className="text-[#7A8781]" aria-hidden />
                  <input name="name" value={form.name} onChange={handleChange} autoComplete="name" placeholder="Nguyễn Minh Anh" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                </span>
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-xs font-bold text-[#405049]">Email</span>
              <span className="flex h-11 items-center gap-2 rounded-lg border border-[#D5DEDA] px-3 focus-within:border-[#0F766E]">
                <Mail size={17} className="text-[#7A8781]" aria-hidden />
                <input name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" placeholder="ban@example.com" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold text-[#405049]">Mật khẩu</span>
              <span className="flex h-11 items-center gap-2 rounded-lg border border-[#D5DEDA] px-3 focus-within:border-[#0F766E]">
                <LockKeyhole size={17} className="text-[#7A8781]" aria-hidden />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  placeholder={isLogin ? 'Mật khẩu của bạn' : 'Tối thiểu 8 ký tự'}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="flex h-8 w-8 items-center justify-center rounded-md text-[#68756F] hover:bg-[#EEF4F1]" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            {error && (
              <p className="rounded-lg border border-[#F3C9C1] bg-[#FFF1EE] p-3 text-xs leading-5 text-[#A73525]" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#C93F2C] text-sm font-bold text-white hover:bg-[#AA3425] disabled:cursor-wait disabled:bg-[#D9A59D]"
            >
              {loading ? <Spinner size="sm" label="Đang xử lý đăng nhập..." /> : <LockKeyhole size={17} aria-hidden />}
              {loading ? 'Đang xử lý...' : isLogin ? 'Đăng nhập an toàn' : 'Tạo tài khoản'}
            </button>
          </form>

          {!isLogin && (
            <p className="mt-4 text-center text-xs leading-5 text-[#7A8781]">
              Khi đăng ký, bạn đồng ý với <Link to="/policy" className="font-semibold text-[#0F766E] hover:underline">chính sách bảo mật và điều khoản</Link>.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
