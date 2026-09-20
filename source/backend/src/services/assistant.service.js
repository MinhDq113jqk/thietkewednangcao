const PRICE_TERMS = [
  'gia',
  'bao nhieu',
  'bao tien',
  'cost',
  'price',
];

const PRODUCT_TERMS = [
  'san pham',
  'mua',
  'tim',
  'gom',
  'tranh',
  'non',
  'moc khoa',
  'vong tay',
  'may tre',
  'qua luu niem',
];

const normalizeText = (value = '') => String(value)
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .replaceAll('đ', 'd')
  .replaceAll('Đ', 'D')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const containsAny = (text, terms) => terms.some((term) => text.includes(term));

const detectAssistantIntent = (message) => {
  const text = normalizeText(message);

  if (containsAny(text, ['otp', 'mat khau', 'password', 'cvv', 'ma pin', 'so the'])) {
    return 'security';
  }
  if (containsAny(text, ['lien he', 'email', 'hotline', 'ho tro', 'cham soc'])) {
    return 'contact';
  }
  if (containsAny(text, ['souvenirshop la gi', 'gioi thieu', 'trang web', 'website', 'trang nay'])) {
    return 'about';
  }
  if (containsAny(text, ['mo gian hang', 'dang ky ban', 'nguoi ban', 'ban hang'])) {
    return 'seller';
  }
  if (containsAny(text, ['theo doi don', 'don hang', 'ma van don', 'van chuyen', 'giao hang'])) {
    return 'orders';
  }
  if (containsAny(text, ['thanh toan', 'vietqr', 'cod', 'chuyen khoan', 'hoan tien'])) {
    return 'payment';
  }
  if (containsAny(text, ['doi tra', 'chinh sach', 'bao mat', 'quyen rieng tu'])) {
    return 'policy';
  }
  if (containsAny(text, PRICE_TERMS) || containsAny(text, PRODUCT_TERMS)) {
    return 'product';
  }
  if (containsAny(text, ['xin chao', 'chao', 'hello', 'hi', 'ban lam duoc gi'])) {
    return 'greeting';
  }

  return 'fallback';
};

const PRODUCT_STOP_WORDS = new Set([
  'a',
  'bao',
  'ban',
  'cho',
  'co',
  'cost',
  'cua',
  'dong',
  'duoc',
  'gia',
  'giup',
  'hien',
  'hoi',
  'la',
  'minh',
  'muon',
  'mua',
  'nay',
  'nhieu',
  'pham',
  'price',
  'san',
  'shop',
  'the',
  'tim',
  'toi',
  'vay',
  'vnd',
  'xem',
]);

const extractProductQuery = (message) => {
  const originalTokens = String(message)
    .trim()
    .replace(/[?!.,:;()[\]{}"'`]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  return originalTokens
    .filter((token) => !PRODUCT_STOP_WORDS.has(normalizeText(token)))
    .join(' ')
    .trim();
};

const formatVnd = (value) => `${new Intl.NumberFormat('vi-VN').format(Number(value) || 0)} ₫`;

const getEffectivePrice = (product) => (
  product.salePrice !== null && product.salePrice !== undefined
    ? Number(product.salePrice)
    : Number(product.price)
);

const buildProductReply = (products, query) => {
  if (!products.length) {
    return {
      reply: `Mình chưa tìm thấy sản phẩm khớp với “${query}”. Bạn có thể thử tên ngắn hơn hoặc mở trang sản phẩm để xem toàn bộ lựa chọn.`,
      suggestions: ['Gốm Bát Tràng', 'Tranh thêu', 'Nón lá'],
    };
  }

  if (products.length === 1) {
    const product = products[0];
    return {
      reply: `${product.name} hiện có giá ${formatVnd(getEffectivePrice(product))}. Giá được lấy trực tiếp từ dữ liệu sản phẩm đang bán.`,
      suggestions: ['Thông tin liên hệ', 'Chính sách thanh toán', 'Tranh thêu'],
    };
  }

  const lowestPrice = Math.min(...products.map(getEffectivePrice));
  return {
      reply: `Mình tìm thấy ${products.length} lựa chọn phù hợp. Giá hiện tại từ ${formatVnd(lowestPrice)}; bạn có thể mở từng sản phẩm để xem chi tiết.`,
      suggestions: ['Gốm Bát Tràng', 'Chính sách thanh toán', 'Liên hệ hỗ trợ'],
  };
};

const STATIC_RESPONSES = {
  greeting: {
    reply: 'Chào bạn, mình có thể tra giá sản phẩm, hướng dẫn mua hàng, thanh toán, theo dõi đơn và tìm đúng kênh hỗ trợ.',
    suggestions: ['Giá tượng gốm Bát Tràng', 'SouvenirShop là gì?', 'Liên hệ hỗ trợ'],
  },
  contact: {
    reply: 'Người mua có thể liên hệ support@souvenirshop.vn. Người bán có thể liên hệ seller@souvenirshop.vn. Khi cần hỗ trợ đơn hàng, hãy gửi kèm mã đơn nhưng không gửi mật khẩu hoặc OTP.',
    actions: [
      { label: 'Mở trang liên hệ', href: '/contact' },
      { label: 'Email hỗ trợ', href: 'mailto:support@souvenirshop.vn' },
    ],
    suggestions: ['Theo dõi đơn hàng', 'Chính sách đổi trả', 'Mở gian hàng'],
  },
  about: {
    reply: 'SouvenirShop là marketplace quà lưu niệm Việt Nam, kết nối người mua với hộ gia đình, làng nghề, cá nhân sáng tạo và xưởng sản xuất trên toàn quốc.',
    actions: [{ label: 'Về SouvenirShop', href: '/about' }],
    suggestions: ['Khám phá sản phẩm', 'Mở gian hàng', 'Chính sách bảo mật'],
  },
  seller: {
    reply: 'Hộ gia đình, làng nghề, cá nhân và xưởng sản xuất đều có thể đăng ký gian hàng. Gian hàng cần được duyệt trước khi đăng bán sản phẩm.',
    actions: [{ label: 'Đăng ký bán hàng', href: '/seller/register' }],
    suggestions: ['Thông tin liên hệ', 'SouvenirShop là gì?', 'Chính sách bảo mật'],
  },
  orders: {
    reply: 'Bạn có thể xem trạng thái, hãng vận chuyển, mã vận đơn, vị trí hiện tại và lịch sử hành trình trong mục Đơn hàng. Bạn cần đăng nhập để xem dữ liệu của mình.',
    actions: [{ label: 'Theo dõi đơn hàng', href: '/orders' }],
    suggestions: ['Liên hệ hỗ trợ', 'Chính sách đổi trả', 'Thanh toán thế nào?'],
  },
  payment: {
    reply: 'SouvenirShop hỗ trợ COD và VietQR. Hệ thống dùng Idempotency-Key để một yêu cầu gửi lại do mạng yếu không tạo thêm đơn hàng.',
    actions: [{ label: 'Xem chính sách', href: '/policy' }],
    suggestions: ['Theo dõi đơn hàng', 'Chính sách đổi trả', 'Liên hệ hỗ trợ'],
  },
  policy: {
    reply: 'SouvenirShop chỉ dùng thông tin cần thiết để xử lý tài khoản, đơn hàng và giao nhận. Không cung cấp mật khẩu ngân hàng hoặc OTP. Điều kiện hủy, đổi trả và hoàn tiền được trình bày tại trang Chính sách.',
    actions: [{ label: 'Xem chính sách', href: '/policy' }],
    suggestions: ['Liên hệ hỗ trợ', 'Thanh toán thế nào?', 'Theo dõi đơn hàng'],
  },
  security: {
    reply: 'Không nhập mật khẩu, OTP, mã PIN, CVV hoặc số thẻ vào cuộc trò chuyện. SouvenirShop không yêu cầu các thông tin này để tư vấn sản phẩm.',
    actions: [{ label: 'Xem chính sách bảo mật', href: '/policy' }],
    suggestions: ['Thông tin liên hệ', 'Khám phá sản phẩm'],
  },
  fallback: {
    reply: 'Mình chưa hiểu rõ câu hỏi đó. Hiện mình hỗ trợ tra giá sản phẩm, thông tin SouvenirShop, liên hệ, thanh toán và theo dõi đơn hàng.',
    suggestions: ['Giá tượng gốm Bát Tràng', 'Liên hệ hỗ trợ', 'SouvenirShop là gì?'],
  },
};

const getStaticResponse = (intent) => STATIC_RESPONSES[intent] || STATIC_RESPONSES.fallback;

module.exports = {
  buildProductReply,
  detectAssistantIntent,
  extractProductQuery,
  getStaticResponse,
  normalizeText,
};
