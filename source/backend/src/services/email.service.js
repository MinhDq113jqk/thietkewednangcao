const nodemailer = require('nodemailer');

const isSmtpConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const createTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')} VND`;

const createHtmlEmail = ({ title, intro, rows = [], cta }) => {
  const safeRows = rows
    .map((row) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#475569;">${escapeHtml(row.label)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#0f172a;font-weight:600;">${escapeHtml(row.value)}</td>
      </tr>
    `)
    .join('');

  const ctaHtml = cta?.href
    ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(cta.href)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:700;">${escapeHtml(cta.label || 'Xem chi tiet')}</a></p>`
    : '';

  return `
    <div style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <div style="padding:20px 24px;background:#0f172a;color:#ffffff;">
          <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#99f6e4;">SouvenirShop</div>
          <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;">${escapeHtml(title)}</h1>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 18px;line-height:1.6;color:#334155;">${escapeHtml(intro)}</p>
          ${safeRows ? `<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">${safeRows}</table>` : ''}
          ${ctaHtml}
          <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.5;">Email nay duoc gui tu he thong SouvenirShop. Vui long khong chia se thong tin tai khoan hoac ma thanh toan cho nguoi khac.</p>
        </div>
      </div>
    </div>
  `;
};

const sendMail = async ({ to, subject, text, html }) => {
  if (!to) return { skipped: true, reason: 'missing-recipient' };

  if (!isSmtpConfigured()) {
    console.log('[email:dev]', { queued: true, subject, hasText: Boolean(text), hasHtml: Boolean(html) });
    return { skipped: true, reason: 'smtp-not-configured' };
  }

  const transporter = createTransporter();
  return transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
};

exports.sendOrderCreatedEmail = async (user, orders) => {
  const orderLines = orders.map((order) =>
    `- #${String(order.id).slice(0, 8)}: ${formatCurrency(Number(order.total || 0) + Number(order.shippingFee || 0))}`
  ).join('\n');

  return sendMail({
    to: user.email,
    subject: 'SouvenirShop - Xac nhan don hang',
    text: `Chao ${user.name || ''},\n\nDon hang cua ban da duoc tao thanh cong:\n${orderLines}\n\nCam on ban da mua hang tai SouvenirShop.`,
    html: createHtmlEmail({
      title: 'Xac nhan don hang',
      intro: `Chao ${user.name || ''}, don hang cua ban da duoc tao thanh cong.`,
      rows: orders.map((order) => ({
        label: `Don #${String(order.id).slice(0, 8)}`,
        value: formatCurrency(Number(order.total || 0) + Number(order.shippingFee || 0)),
      })),
      cta: { href: `${process.env.CLIENT_URL || 'http://localhost:5173'}/orders`, label: 'Xem don hang' },
    }),
  });
};

exports.sendOrderStatusEmail = async (user, order) => sendMail({
  to: user?.email,
  subject: 'SouvenirShop - Cap nhat trang thai don hang',
  text: `Chao ${user?.name || ''},\n\nDon hang #${String(order.id).slice(0, 8)} da chuyen sang trang thai: ${order.status}.\n\nSouvenirShop`,
  html: createHtmlEmail({
    title: 'Cap nhat trang thai don hang',
    intro: `Chao ${user?.name || ''}, don hang cua ban vua duoc cap nhat.`,
    rows: [
      { label: 'Ma don hang', value: `#${String(order.id).slice(0, 8)}` },
      { label: 'Trang thai moi', value: order.status },
    ],
    cta: { href: `${process.env.CLIENT_URL || 'http://localhost:5173'}/orders`, label: 'Xem don hang' },
  }),
});

exports.sendWelcomeEmail = async (user) => sendMail({
  to: user?.email,
  subject: 'SouvenirShop - Chao mung ban',
  text: `Chao ${user?.name || ''},\n\nTai khoan SouvenirShop cua ban da duoc tao thanh cong.\n\nSouvenirShop`,
  html: createHtmlEmail({
    title: 'Chao mung ban den SouvenirShop',
    intro: `Chao ${user?.name || ''}, tai khoan cua ban da duoc tao thanh cong.`,
    rows: [
      { label: 'Email dang nhap', value: user?.email || '' },
      { label: 'Vai tro', value: user?.role || 'buyer' },
    ],
    cta: { href: `${process.env.CLIENT_URL || 'http://localhost:5173'}/products`, label: 'Bat dau mua sam' },
  }),
});

exports.sendShopRegistrationEmail = async (user, shop) => sendMail({
  to: user?.email,
  subject: 'SouvenirShop - Da nhan dang ky gian hang',
  text: `Chao ${user?.name || ''},\n\nGian hang "${shop?.name || ''}" da duoc tao voi trang thai ${shop?.status || 'pending'}.\n\nSouvenirShop`,
  html: createHtmlEmail({
    title: 'Da nhan dang ky gian hang',
    intro: `Chao ${user?.name || ''}, chung toi da nhan dang ky gian hang cua ban.`,
    rows: [
      { label: 'Ten gian hang', value: shop?.name || '' },
      { label: 'Slug', value: shop?.slug || '' },
      { label: 'Trang thai', value: shop?.status || 'pending' },
    ],
    cta: { href: `${process.env.CLIENT_URL || 'http://localhost:5173'}/seller`, label: 'Quan ly gian hang' },
  }),
});
