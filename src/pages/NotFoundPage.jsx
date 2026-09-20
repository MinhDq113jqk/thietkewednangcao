import { ArrowLeft, Compass, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[520px] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#E6F3F1] text-[#0F766E]">
        <Compass size={28} aria-hidden />
      </span>
      <p className="mt-6 text-xs font-bold uppercase text-[#C93F2C]">Lỗi 404</p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-[#17201D]">Trang này không còn ở đây.</h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-[#68756F]">
        Đường dẫn có thể đã thay đổi. Bạn có thể trở về trang chủ hoặc tiếp tục tìm món quà phù hợp.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/" className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#CAD5D0] bg-white px-5 text-sm font-bold text-[#405049] hover:border-[#0F766E]">
          <ArrowLeft size={17} aria-hidden />
          Về trang chủ
        </Link>
        <Link to="/products" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#0F766E] px-5 text-sm font-bold text-white hover:bg-[#0B5F58]">
          <Search size={17} aria-hidden />
          Tìm sản phẩm
        </Link>
      </div>
    </main>
  );
}

export default NotFoundPage;
