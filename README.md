# SouvenirShop

SouvenirShop là marketplace quà lưu niệm Việt Nam dành cho người mua trong và ngoài nước, đồng thời cung cấp kênh bán hàng cho hộ gia đình, làng nghề, cá nhân sáng tạo và xưởng sản xuất.

## Chức năng chính

- Khám phá, tìm kiếm, lọc và xem chi tiết sản phẩm theo gian hàng.
- Gợi ý sản phẩm kết hợp sở thích danh mục ẩn danh, sản phẩm đang xem, lịch sử mua và độ phổ biến.
- Giỏ hàng, COD, VietQR và chống tạo đơn lặp bằng `Idempotency-Key`.
- Theo dõi trạng thái, hãng vận chuyển, mã vận đơn, vị trí hiện tại và lịch sử hành trình.
- Tài khoản người mua, sổ địa chỉ và đổi mật khẩu.
- Kênh người bán quản lý sản phẩm, đơn hàng, giao vận, gian hàng và doanh thu.
- Kênh quản trị duyệt gian hàng, quản lý người dùng và đơn hàng.

## Công nghệ

- Frontend: React 19, Vite 8, React Router, TanStack Query, Zustand, Tailwind CSS.
- Backend: Node.js, Express, Sequelize.
- Database: PostgreSQL.
- Kiểm thử: Node test runner và Playwright.

## Cấu trúc

- `source/`: toàn bộ mã nguồn và các package chạy được.
- `docs/`: tài liệu, Postman collection, roadmap và ảnh minh chứng.
- `.github/`: workflow CI.

## Chạy local

Yêu cầu: Node.js, npm và PostgreSQL.

Các lệnh mã nguồn chạy từ thư mục `source/`:

1. Cài dependencies:

```powershell
cd source
npm.cmd install
npm.cmd --prefix backend install
```

2. Tạo cấu hình backend:

```powershell
Copy-Item backend\.env.example backend\.env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Chạy lệnh sinh chuỗi hai lần và đặt hai giá trị khác nhau vào `JWT_SECRET` và `JWT_REFRESH_SECRET` trong `source\backend\.env`. Cập nhật `DATABASE_URL` theo PostgreSQL local. Không commit file `.env`.

3. Khởi tạo database:

```powershell
npm.cmd --prefix backend run migrate
npm.cmd --prefix backend run seed
```

`seed` dùng `SEED_ACCOUNT_PASSWORD` từ môi trường; nếu chưa đặt, script tạo mật khẩu ngẫu nhiên và chỉ in một lần trong terminal local.

4. Mở hai terminal:

```powershell
cd source
npm.cmd --prefix backend run dev
```

```powershell
cd source
npm.cmd run dev
```

Truy cập `http://127.0.0.1:5173`. API chạy tại `http://localhost:3000`; kiểm tra nhanh bằng `http://localhost:3000/health`.

## Kiểm tra chất lượng

```powershell
cd source
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd --prefix backend run smoke:core
```

## Nguyên tắc bảo mật

- Refresh token nằm trong cookie `HttpOnly`; access token chỉ giữ trong bộ nhớ phiên đang mở.
- Refresh token được băm trước khi lưu database và được xoay vòng khi làm mới phiên.
- Mật khẩu được băm bằng bcrypt; secret và thông tin tài khoản mẫu không nằm trong mã nguồn.
- API có CORS allowlist, Helmet, rate limit, giới hạn body và định dạng lỗi không lộ stack ở production.
- Thanh toán và tạo đơn dùng khóa idempotency bền vững để lần gửi lại không trừ kho hoặc tạo thêm đơn.
- Quyền buyer, seller và admin được kiểm tra tại route backend; dữ liệu đơn hàng được giới hạn theo chủ sở hữu.

## Thanh toán và giao vận production

COD và tạo mã VietQR đã sẵn sàng cho luồng MVP. Trước khi nhận tiền thật cần cấu hình tài khoản VietQR, webhook/đối soát thanh toán từ nhà cung cấp và tích hợp API hãng vận chuyển bằng credential production. Không đưa các credential này vào repository.
