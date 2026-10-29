import { Container as BsContainer } from 'react-bootstrap';
import { Leaf, MapPin, Palette, Sparkles } from 'lucide-react';
import heroImage from '../../../assets/hero-souvenir-v2.webp';

const stories = [
  {
    number: '01',
    title: 'Một món quà bắt đầu từ nơi nó được làm ra',
    excerpt: 'Tên làng nghề, chất liệu và bàn tay người thợ giúp món lưu niệm vượt khỏi vai trò của một vật trang trí.',
    icon: MapPin,
    color: 'bg-[#EAF2FF] text-[#2563EB]',
  },
  {
    number: '02',
    title: 'Chọn chất liệu cho người sẽ nhận',
    excerpt: 'Gốm mang cảm giác bền vững, lụa và thêu gần gũi, còn mây tre nhẹ để đồng hành trong những chuyến đi xa.',
    icon: Leaf,
    color: 'bg-[#EDF5E8] text-[#3E7A35]',
  },
  {
    number: '03',
    title: 'Giữ truyền thống trong một dáng vẻ mới',
    excerpt: 'Một sản phẩm hiện đại không cần rời bỏ bản sắc; tỷ lệ, công năng và cách hoàn thiện tốt khiến câu chuyện cũ dễ bước vào đời sống mới.',
    icon: Palette,
    color: 'bg-[#FFF1EE] text-[#C93F2C]',
  },
];

function BlogsPage() {
  return (
    <main>
      <section className="position-relative overflow-hidden border-bottom blogs-page-detail-1">
        <img src={heroImage} alt="" className="position-absolute h-100 w-100 object-fit-cover blogs-page-detail-2" />
        <div className="position-absolute blogs-page-detail-3" aria-hidden />
        <BsContainer as="div" className="position-relative d-flex align-items-center py-5 blogs-page-detail-4">
          <div className="blogs-page-detail-5">
            <p className="d-flex align-items-center gap-2 booking-caption fw-bold text-uppercase text-primary">
              <Sparkles size={15} aria-hidden />
              Nhật ký SouvenirShop
            </p>
            <h1 className="mt-3 booking-title fs-2 fw-semibold lh-sm text-dark blogs-page-detail-6">
              Câu chuyện quà Việt
            </h1>
            <p className="mt-4 booking-small text-secondary blogs-page-detail-7">
              Những ghi chép ngắn về chất liệu, vùng miền và cách một món đồ thủ công trở thành ký ức có thể mang theo.
            </p>
          </div>
        </BsContainer>
      </section>

      <BsContainer as="section" className="py-5 booking-narrow">
        <div className="border-top border-bottom blogs-page-detail-8">
          {stories.map(({ color, excerpt, icon: Icon, number, title }) => (
            <article key={number} className="d-grid gap-5 py-5 align-items-sm-start blogs-page-detail-9">
              <span className="booking-title fs-4 fw-semibold text-secondary">{number}</span>
              <div>
                <h2 className="booking-title fs-4 fw-semibold text-dark">{title}</h2>
                <p className="mt-2 booking-small text-secondary blogs-page-detail-10">{excerpt}</p>
              </div>
              <span className={`d-flex align-items-center justify-content-center rounded-3 blogs-page-detail-11 ${color}`}>
                <Icon size={21} aria-hidden />
              </span>
            </article>
          ))}
        </div>
      </BsContainer>
    </main>
  );
}

export default BlogsPage;
