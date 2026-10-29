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

export const informationContent = {
  about: {
    eyebrow: 'Về SouvenirShop',
    title: 'Để quà Việt được nhớ bằng câu chuyện thật.',
    intro: 'SouvenirShop kết nối người mua với hộ gia đình, làng nghề, cá nhân sáng tạo và xưởng sản xuất trên khắp Việt Nam.',
    icon: Globe2,
    tone: "bg-primary-subtle text-primary",
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
    tone: 'bg-danger-subtle text-danger',
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
        body: 'Bạn có thể hủy đơn đang chờ xác nhận hoặc gửi yêu cầu đổi trả, khiếu nại tại trang chi tiết đơn, kèm sản phẩm, số lượng và bằng chứng. Thời hạn gửi yêu cầu được hiển thị tại đó. Cửa hàng sẽ duyệt và kiểm tra hàng trả về; các khoản hoàn tiền được ghi nhận sau khi đối chiếu chứng từ chuyển trả.',
      },
    ],
  },
  contact: {
    eyebrow: 'Liên hệ',
    title: 'Hỗ trợ đúng việc, đúng kênh.',
    intro: 'Vui lòng gửi kèm mã đơn hoặc tên gian hàng khi liên hệ để yêu cầu được xác định nhanh hơn.',
    icon: Mail,
    tone: 'bg-primary-subtle text-primary',
    sections: [
      {
        title: 'Hỗ trợ người mua',
        icon: PackageCheck,
        body: 'Các vấn đề về đặt hàng, thanh toán, giao nhận, hủy đơn và đổi trả.',
        action: { href: '/support', label: 'Tạo yêu cầu hỗ trợ' },
      },
      {
        title: 'Hỗ trợ người bán',
        icon: Store,
        body: 'Đăng ký gian hàng, duyệt sản phẩm, vận hành đơn và cập nhật vận chuyển.',
        action: { href: '/support', label: 'Gửi yêu cầu cho bộ phận hỗ trợ' },
      },
      {
        title: 'Phạm vi hoạt động',
        icon: MapPin,
        body: 'Nền tảng phục vụ các gian hàng và người mua trên toàn quốc; thời gian giao hàng phụ thuộc tuyến vận chuyển của từng đơn.',
      },
    ],
  },
};

export const resolveInformationContent = type => Object.hasOwn(informationContent, type) ? informationContent[type] : informationContent.about;
