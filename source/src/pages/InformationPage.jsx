import {
  BadgeCheck,
  Globe2,
  HandHeart,
  Mail,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Store,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const content = {
  about: {
    eyebrow: 'Về SouvenirShop',
    title: 'Để quà Việt được nhớ bằng câu chuyện thật.',
    intro: 'SouvenirShop kết nối người mua với hộ gia đình, làng nghề, cá nhân sáng tạo và xưởng sản xuất trên khắp Việt Nam.',
    icon: Globe2,
    tone: 'bg-[#E6F3F1] text-[#0F766E]',
    sections: [
      {
        title: 'Dành cho người tìm quà',
        icon: UsersRound,
        body: 'Một nơi để khám phá món quà theo vùng miền, chất liệu, mức giá và sở thích, dù bạn đang đi du lịch, sống ở nước ngoài hay xây dựng bộ sưu tập riêng.',
      },
      {
        title: 'Dành cho người làm nghề',
        icon: Store,
        body: 'Gian hàng rõ ràng giúp người bán kể nguồn gốc sản phẩm, quản lý đơn và cập nhật hành trình giao hàng trong một quy trình thống nhất.',
      },
      {
        title: 'Điều chúng tôi giữ',
        icon: HandHeart,
        body: 'Tôn trọng người làm ra sản phẩm, minh bạch thông tin và đặt sự an tâm của người mua vào từng quyết định vận hành.',
      },
    ],
  },
  policy: {
    eyebrow: 'Chính sách',
    title: 'Rõ ràng trước khi bạn đặt hàng.',
    intro: 'Các nguyên tắc dưới đây áp dụng cho tài khoản, thanh toán, giao nhận và yêu cầu hỗ trợ trên SouvenirShop.',
    icon: ShieldCheck,
    tone: 'bg-[#FFF1EE] text-[#C93F2C]',
    sections: [
      {
        title: 'Thông tin và quyền riêng tư',
        icon: ShieldCheck,
        body: 'Tên, email, số điện thoại và địa chỉ chỉ được dùng cho tài khoản, xử lý đơn và giao nhận. SouvenirShop không yêu cầu mật khẩu ngân hàng hoặc mã OTP thanh toán.',
      },
      {
        title: 'Đặt hàng và thanh toán',
        icon: BadgeCheck,
        body: 'Khách có thể chọn COD hoặc VietQR. Khi kết nối không ổn định, việc gửi lại cùng một yêu cầu không tạo thêm đơn mới. Chuyển khoản chỉ được xem là hoàn tất sau khi trạng thái thanh toán được xác nhận.',
      },
      {
        title: 'Hủy, đổi trả và hoàn tiền',
        icon: PackageCheck,
        body: 'Đơn đang chờ xác nhận có thể được hủy trong trang đơn hàng. Với đơn đã xử lý, sản phẩm lỗi hoặc sai mô tả, khách cần liên hệ hỗ trợ kèm mã đơn và hình ảnh để được đối soát.',
      },
    ],
  },
  contact: {
    eyebrow: 'Liên hệ',
    title: 'Hỗ trợ đúng việc, đúng kênh.',
    intro: 'Vui lòng gửi kèm mã đơn hoặc tên gian hàng khi liên hệ để yêu cầu được xác định nhanh hơn.',
    icon: Mail,
    tone: 'bg-[#EAF2FF] text-[#2563EB]',
    sections: [
      {
        title: 'Hỗ trợ người mua',
        icon: PackageCheck,
        body: 'Các vấn đề về đặt hàng, thanh toán, giao nhận, hủy đơn và đổi trả.',
        action: { href: 'mailto:support@souvenirshop.vn?subject=Ho%20tro%20nguoi%20mua', label: 'support@souvenirshop.vn' },
      },
      {
        title: 'Hỗ trợ người bán',
        icon: Store,
        body: 'Đăng ký gian hàng, duyệt sản phẩm, vận hành đơn và cập nhật vận chuyển.',
        action: { href: 'mailto:seller@souvenirshop.vn?subject=Ho%20tro%20nguoi%20ban', label: 'seller@souvenirshop.vn' },
      },
      {
        title: 'Phạm vi hoạt động',
        icon: MapPin,
        body: 'Nền tảng phục vụ các gian hàng và người mua trên toàn quốc; thời gian giao hàng phụ thuộc tuyến vận chuyển của từng đơn.',
      },
    ],
  },
};

function InformationPage({ type = 'about' }) {
  const page = content[type] || content.about;
  const PageIcon = page.icon;

  return (
    <main>
      <section className="border-b border-[#DDE4E0] bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <span className={`flex h-12 w-12 items-center justify-center rounded-lg ${page.tone}`}>
            <PageIcon size={24} aria-hidden />
          </span>
          <p className="mt-6 text-xs font-bold uppercase text-[#0F766E]">{page.eyebrow}</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight text-[#17201D] sm:text-5xl">
            {page.title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[#596760]">{page.intro}</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="divide-y divide-[#DDE4E0] border-y border-[#DDE4E0]">
          {page.sections.map(({ action, body, icon: Icon, title }) => (
            <article key={title} className="grid gap-4 py-7 sm:grid-cols-[48px_1fr]">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF4F1] text-[#0F766E]">
                <Icon size={20} aria-hidden />
              </span>
              <div>
                <h2 className="text-base font-bold text-[#17201D]">{title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-[#68756F]">{body}</p>
                {action && (
                  <a href={action.href} className="mt-3 inline-block text-sm font-bold text-[#0F766E] hover:underline">
                    {action.label}
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/products" className="inline-flex h-11 items-center justify-center rounded-lg bg-[#0F766E] px-5 text-sm font-bold text-white hover:bg-[#0B5F58]">
            Khám phá sản phẩm
          </Link>
          <Link to="/seller/register" className="inline-flex h-11 items-center justify-center rounded-lg border border-[#CAD5D0] bg-white px-5 text-sm font-bold text-[#405049] hover:border-[#0F766E] hover:text-[#0F766E]">
            Mở gian hàng
          </Link>
        </div>
      </section>
    </main>
  );
}

export default InformationPage;
