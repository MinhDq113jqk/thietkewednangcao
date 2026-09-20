import { Leaf, MapPin, Palette, Sparkles } from 'lucide-react';
import heroImage from '../assets/hero-souvenir-v2.webp';

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
      <section className="relative min-h-[390px] overflow-hidden border-b border-[#DDE4E0]">
        <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover object-[72%_center]" />
        <div className="absolute inset-0 bg-white/78 sm:bg-gradient-to-r sm:from-white sm:via-white/85 sm:to-white/10" aria-hidden />
        <div className="relative mx-auto flex min-h-[390px] max-w-7xl items-center px-4 py-12">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase text-[#0F766E]">
              <Sparkles size={15} aria-hidden />
              Nhật ký SouvenirShop
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-[#17201D] sm:text-5xl">
              Câu chuyện quà Việt
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#596760] sm:text-base">
              Những ghi chép ngắn về chất liệu, vùng miền và cách một món đồ thủ công trở thành ký ức có thể mang theo.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="divide-y divide-[#DDE4E0] border-y border-[#DDE4E0]">
          {stories.map(({ color, excerpt, icon: Icon, number, title }) => (
            <article key={number} className="grid gap-5 py-8 sm:grid-cols-[64px_1fr_auto] sm:items-start">
              <span className="font-display text-2xl font-semibold text-[#A6B2AC]">{number}</span>
              <div>
                <h2 className="font-display text-2xl font-semibold text-[#17201D]">{title}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#68756F]">{excerpt}</p>
              </div>
              <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${color}`}>
                <Icon size={21} aria-hidden />
              </span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default BlogsPage;
