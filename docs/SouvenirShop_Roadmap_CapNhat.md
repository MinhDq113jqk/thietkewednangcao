# SouvenirShop - Roadmap cập nhật

**Ngày cập nhật:** 28/06/2026  
**Trạng thái hiện tại:** Hoàn thành Phase 1, 2, 3, 4, 5, 6; Phase 7 đã có upload local/Cloudinary provider, shipping estimator, VietQR thật kèm smoke test end-to-end, email fallback và HTML template; Phase 8 đã có tối ưu MVP, request logging, error format thống nhất, CORS production và CI GitHub Actions  
**Phase tiếp theo:** Smoke test Cloudinary/SMTP/thanh toán/vận chuyển bằng credential thật/sandbox, sau đó chuyển sang test E2E và deploy thật  
**Stack hiện tại:** React + Vite + Tailwind CSS, Node.js + Express, PostgreSQL, Sequelize, Zustand, React Query, Axios

---

## 1. Tổng quan tiến độ

| Phase | Nội dung | Trạng thái |
|---|---|---|
| Phase 1 | Setup dự án và cấu hình frontend | Hoàn thành |
| Phase 2 | Frontend Người mua cơ bản | Hoàn thành |
| Phase 3 | Hoàn thiện frontend buyer + Backend Auth/User | Hoàn thành |
| Phase 4 | Product, Shop, Order API + kết nối frontend thật | Hoàn thành |
| Phase 5 | Dashboard Người bán | Hoàn thành MVP |
| Phase 6 | Dashboard Điều hành/Admin | Hoàn thành MVP |
| Phase 7 | Tích hợp thanh toán, vận chuyển, email, upload ảnh | Đang làm MVP, khoảng 70% |
| Phase 8 | Tối ưu, testing, SEO, deploy | Đang làm MVP, khoảng 65% |

Tiến độ tổng thể hiện tại: **khoảng 90% toàn dự án marketplace đầy đủ**.  
Riêng phần MVP buyer + seller + admin + backend core + upload local/cloud-ready + shipping estimator + VietQR end-to-end + email fallback/template + tối ưu cơ bản + CI nền hiện đã ở mức chạy được luồng thật.

---

## 2. Phase 1 - Setup dự án và cấu hình

**Trạng thái:** Hoàn thành

- [x] Khởi tạo Vite + React
- [x] Cài Tailwind CSS
- [x] Cài thư viện chính: `react-router-dom`, `axios`, `zustand`, `@tanstack/react-query`, `lucide-react`
- [x] Tạo cấu trúc `src/`
- [x] Cấu hình `QueryClientProvider`
- [x] Cấu hình `BrowserRouter`
- [x] Tạo `axiosInstance`
- [x] Cấu hình frontend dev server cố định port `5173`
- [x] Cấu hình Vite proxy `/api` sang backend `localhost:3000`

---

## 3. Phase 2 - Frontend Người mua

**Trạng thái:** Hoàn thành

- [x] Header
- [x] Footer
- [x] Trang chủ
- [x] Danh sách sản phẩm
- [x] Chi tiết sản phẩm
- [x] Giỏ hàng
- [x] Checkout
- [x] Đơn hàng của tôi
- [x] Đăng nhập / Đăng ký
- [x] Hồ sơ cá nhân
- [x] Trang gian hàng
- [x] ProductCard dùng lại nhiều nơi
- [x] UI loading skeleton
- [x] Toast thông báo
- [x] Cart persist bằng localStorage

Ghi chú: giao diện buyer đã dùng API thật ở các luồng chính.

---

## 4. Phase 3 - Backend Auth/User + hoàn thiện frontend buyer

**Trạng thái:** Hoàn thành

### Auth

- [x] `POST /api/auth/register`
- [x] `POST /api/auth/login`
- [x] `GET /api/auth/me`
- [x] `POST /api/auth/logout`
- [x] JWT middleware
- [x] RBAC middleware
- [x] Frontend login gọi API thật
- [x] Token lưu trong `authStore`
- [x] Axios interceptor gắn token
- [x] Xử lý 401 tự logout

### Users

- [x] `GET /api/users/profile`
- [x] `PUT /api/users/profile`
- [x] `GET /api/users/addresses`
- [x] `POST /api/users/addresses`
- [x] `PUT /api/users/addresses/:id`
- [x] `DELETE /api/users/addresses/:id`
- [x] `PUT /api/users/password`

### Protected route

- [x] Chặn trang cần đăng nhập
- [x] Redirect về login khi chưa đăng nhập
- [x] Đăng nhập xong quay lại trang ban đầu, ví dụ checkout

---

## 5. Phase 4 - Product, Shop, Order API + frontend thật

**Trạng thái:** Hoàn thành

### 5.1 Product API public

- [x] `GET /api/products`
- [x] Hỗ trợ query:
  - `category`
  - `search`
  - `minPrice`
  - `maxPrice`
  - `sort`
  - `page`
  - `limit`
- [x] `GET /api/products/:id`
- [x] Include thông tin shop
- [x] Include reviews cơ bản
- [x] `GET /api/products/search`
- [x] PostgreSQL full-text search bằng `to_tsvector`
- [x] Fallback search bằng `ILIKE`
- [x] Sort theo:
  - mới nhất
  - bán chạy
  - giá thấp đến cao
  - giá cao đến thấp

### 5.2 Redis cache

- [x] Cache danh sách sản phẩm
- [x] Cache kết quả search
- [x] TTL mặc định 60 giây
- [x] Invalidate cache khi seller tạo/sửa/ẩn sản phẩm
- [x] Fallback an toàn: nếu local chưa có `REDIS_URL`, API vẫn chạy bình thường

### 5.3 Database index

- [x] Index `products(category)`
- [x] Index `products(shopId)`
- [x] Index `products(price)`
- [x] Index `products(sold)`
- [x] GIN index cho full-text search sản phẩm

### 5.4 Seller Product API

- [x] `GET /api/seller/products`
- [x] `POST /api/seller/products`
- [x] `PUT /api/seller/products/:id`
- [x] `DELETE /api/seller/products/:id` để ẩn sản phẩm khỏi buyer
- [x] `PUT /api/seller/products/:id/restore` để khôi phục sản phẩm đã ẩn
- [x] `DELETE /api/seller/products/:id/permanent` để xóa vĩnh viễn sản phẩm chưa có đơn hàng/đánh giá
- [x] Kiểm tra role seller/admin
- [x] Chỉ thao tác sản phẩm thuộc shop của seller
- [x] Xóa hiện tại là ẩn sản phẩm bằng `isActive = false`
- [x] Chặn xóa vĩnh viễn nếu sản phẩm đã có `OrderItem` hoặc `Review`

### 5.5 Shop API

- [x] `POST /api/shops/register`
- [x] `GET /api/shops/:slug`
- [x] `GET /api/shops/:slug/products`
- [x] `PUT /api/shops/me`
- [x] Tự tạo slug shop
- [x] Public shop chỉ hiện khi shop active

### 5.6 Order API buyer

- [x] `POST /api/orders`
- [x] Tạo đơn bằng transaction
- [x] Validate tồn kho
- [x] Tự nhóm đơn theo shop
- [x] Tạo order items
- [x] Trừ tồn kho
- [x] Tăng số lượng đã bán
- [x] `GET /api/orders`
- [x] `GET /api/orders/:id`
- [x] `PUT /api/orders/:id/cancel`
- [x] Hủy đơn chỉ khi trạng thái `pending`
- [x] Hủy đơn hoàn lại tồn kho

### 5.7 Order API seller

- [x] `GET /api/seller/orders`
- [x] `PUT /api/seller/orders/:id/confirm`
- [x] `PUT /api/seller/orders/:id/pack`
- [x] Kiểm tra seller chỉ xem/sửa đơn thuộc shop của mình

### 5.8 Frontend kết nối API thật

- [x] `ProductListPage` gọi API thật
- [x] `ProductListPage` có search
- [x] `ProductListPage` có filter category
- [x] `ProductListPage` có filter giá từ/đến
- [x] `ProductListPage` có sort
- [x] `ProductListPage` có pagination
- [x] `ProductDetailPage` gọi API thật
- [x] `HomePage` lấy sản phẩm thật nếu database có dữ liệu
- [x] `CheckoutPage` gọi `POST /api/orders`
- [x] `OrdersPage` gọi `GET /api/orders`
- [x] `OrdersPage` có hủy đơn pending
- [x] `ShopPage` gọi API shop thật
- [x] `ProductCard` xử lý shop dạng object hoặc string

### 5.9 Seed và test data

- [x] Script `npm.cmd run seed`
- [x] Tạo seller test
- [x] Tạo buyer test
- [x] Tạo shop active
- [x] Tạo 8 sản phẩm mẫu
- [x] Tự reset password tài khoản test về `123456`
- [x] Tự dọn sản phẩm trùng theo tên trong shop test

Tài khoản test:

```text
buyer-test@example.com / 123456
seller-test@example.com / 123456
```

### 5.10 Kiểm thử đã chạy

- [x] `npm.cmd run migrate`
- [x] `npm.cmd run seed`
- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`
- [x] API smoke test product list
- [x] API smoke test full-text search
- [x] API smoke test seller create/update/delete product
- [x] API smoke test buyer create/cancel order

Kết luận: **Phase 4 hoàn thành 100% theo MVP roadmap.**

---

## 6. Phase 5 - Dashboard Người bán

**Trạng thái:** Hoàn thành MVP

Mục tiêu: seller có giao diện riêng để đăng ký/quản lý gian hàng, quản lý sản phẩm, xem đơn hàng và doanh thu.

### 6.1 Layout Seller

- [x] Tạo route group `/seller/*`
- [x] Tạo `SellerLayout`
- [x] Sidebar seller
- [x] Header seller dùng layout chung hiện có
- [x] Protected route role seller/admin
- [x] Empty state và loading state cho các trang seller

### 6.2 Đăng ký và quản lý gian hàng

- [x] `pages/seller/SellerRegister.jsx`
- [x] Form đăng ký gian hàng
- [x] Gọi `POST /api/shops/register`
- [x] Hiển thị trạng thái pending/active/suspended
- [x] `pages/seller/SellerShopSettings.jsx`
- [x] Gọi `PUT /api/shops/me`
- [x] Chỉnh tên shop, mô tả, địa điểm, logo/banner dạng URL tạm

### 6.3 Quản lý sản phẩm seller

- [x] `pages/seller/SellerProducts.jsx`
- [x] Bảng danh sách sản phẩm của shop
- [x] Search/filter theo trạng thái và danh mục
- [x] Nút thêm sản phẩm
- [x] Nút sửa sản phẩm
- [x] Nút ẩn sản phẩm
- [x] `pages/seller/SellerProductForm.jsx`
- [x] Form thêm/sửa sản phẩm
- [x] Gọi `POST /api/seller/products`
- [x] Gọi `PUT /api/seller/products/:id`
- [x] Ảnh sản phẩm nhập URL tạm, upload thật để Phase 7

### 6.4 Quản lý đơn hàng seller

- [x] `pages/seller/SellerOrders.jsx`
- [x] Bảng đơn hàng theo shop
- [x] Tab/filter theo trạng thái
- [x] Xem chi tiết đơn trong bảng MVP
- [x] Xác nhận đơn bằng `PUT /api/seller/orders/:id/confirm`
- [x] Chuyển sang đóng gói bằng `PUT /api/seller/orders/:id/pack`

### 6.5 Dashboard và doanh thu seller

- [x] `pages/seller/SellerDashboard.jsx`
- [x] Cards tổng quan:
  - tổng sản phẩm
  - đơn chờ xử lý
  - doanh thu tạm tính
  - sản phẩm bán chạy
- [x] `pages/seller/SellerRevenue.jsx`
- [x] Lịch sử doanh thu theo đơn
- [x] Tạm tính hoa hồng

### 6.6 API bổ sung nên làm trong Phase 5

- [x] `GET /api/seller/orders/stats` cho dashboard và doanh thu
- [x] `GET /api/shops/me`
- [x] Có thể khôi phục sản phẩm đã ẩn bằng `PUT /api/seller/products/:id/restore`
- [x] Có thể xóa vĩnh viễn sản phẩm chưa phát sinh đơn hàng/đánh giá

---

## 7. Phase 6 - Dashboard Điều hành/Admin

**Trạng thái:** Hoàn thành MVP

### Admin Shops

- [x] `GET /api/admin/shops`
- [x] `PUT /api/admin/shops/:id/approve`
- [x] `PUT /api/admin/shops/:id/suspend`
- [x] Giao diện duyệt shop

### Admin Users

- [x] `GET /api/admin/users`
- [x] `PUT /api/admin/users/:id/status`
- [x] Giao diện quản lý người dùng

### Admin Orders/Shipping

- [x] `GET /api/admin/orders`
- [x] `PUT /api/admin/orders/:id/status`
- [x] Giao diện theo dõi đơn hàng/trạng thái vận chuyển MVP

### Admin Reports

- [x] Dashboard GMV
- [x] Báo cáo doanh thu sàn mức tổng quan
- [ ] Top shop
- [ ] Export CSV

---

## 8. Phase 7 - Tích hợp dịch vụ ngoài

**Trạng thái:** Đang làm MVP

### Thanh toán

- [x] VietQR.io tạo QR chuyển khoản ngân hàng
- [ ] MoMo sandbox
- [ ] VNPay sandbox
- [ ] Payment callback/webhook
- [ ] Trang kết quả thanh toán

### Vận chuyển

- [ ] GHN/GHTK sandbox
- [x] Tính phí ship MVP bằng internal estimator
- [ ] Tạo vận đơn
- [ ] Tracking đơn hàng

### Email

- [x] Nodemailer service với fallback log khi chưa có SMTP
- [x] Email đăng ký
- [x] Email xác nhận đơn qua service fallback
- [x] Email cập nhật trạng thái đơn qua service fallback

### Upload ảnh

- [x] Cloudinary provider với fallback local
- [x] Upload ảnh sản phẩm bằng local upload MVP
- [ ] Upload avatar
- [x] Upload logo/banner shop bằng local upload MVP
- [x] Validate file type/size ở backend upload

---

## 9. Phase 8 - Tối ưu, testing, deploy

**Trạng thái:** Đang làm MVP

### Frontend

- [x] Lazy loading pages
- [x] Code splitting
- [x] SEO metadata cơ bản
- [x] Bắt đầu tách logic component sang custom hooks
- [x] Chuẩn hóa styling frontend về Tailwind, bỏ CSS Modules còn lại
- [ ] Tối ưu ảnh
- [ ] Lighthouse Performance >= 90
- [ ] Lighthouse SEO >= 90

### Backend

- [x] Rate limiting MVP bằng in-memory middleware
- [x] Compression gzip MVP bằng middleware nội bộ
- [x] Logging tốt hơn
- [x] Error format thống nhất
- [ ] Database indexes bổ sung theo query thực tế

### Testing

- [x] Unit test cartStore
- [x] Unit test utility functions
- [x] Unit test helper logic cho custom hooks frontend
- [x] API collection Postman/Thunder Client
- [ ] Test E2E luồng mua hàng
- [ ] Test responsive

### Deploy

- [ ] Deploy frontend Vercel
- [ ] Deploy backend Railway/Render
- [ ] PostgreSQL production
- [ ] Redis production Upstash
- [x] CORS production
- [x] CI/CD GitHub Actions


---

## 10. Lệnh phát triển thường dùng

### Backend

```bash
cd backend
npm.cmd run migrate
npm.cmd run seed
npm.cmd run smoke:vietqr
npm.cmd run dev
```

Backend mặc định:

```text
http://localhost:3000
```

### Frontend

```bash
npm.cmd run dev
```

Frontend mặc định:

```text
http://127.0.0.1:5173
```

### Kiểm tra build

```bash
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

---

## 11. Checklist ưu tiên tiếp theo

Thứ tự đề xuất:

1. Smoke test Cloudinary bằng credential thật và bật `UPLOAD_PROVIDER=cloudinary`
2. Cấu hình SMTP thật hoặc SendGrid
3. Tích hợp thanh toán MoMo sandbox nếu cần thêm ví điện tử ngoài chuyển khoản ngân hàng
4. Tích hợp thanh toán VNPay sandbox nếu cần cổng thẻ/ATM nội địa
5. Tích hợp GHN/GHTK sandbox
6. Hoàn thiện tracking đơn hàng
7. Bắt đầu Phase 8 testing tự động nếu chưa có credential dịch vụ ngoài

Mục tiêu kế tiếp: **hoàn thiện Phase 7 bằng credential thật/sandbox cho upload cloud, SMTP, thanh toán phụ trợ và vận chuyển.**

---

## 12. Cập nhật Phase 5 - 27/06/2026

**Trạng thái:** Hoàn thành MVP  
**Mức hoàn thành Phase 5 hiện tại:** 100% theo phạm vi MVP trong roadmap

Đã hoàn thành:

- [x] Backend `GET /api/shops/me`
- [x] Backend `GET /api/seller/orders/stats`
- [x] Chuẩn hóa `backend/src/app.js` để có thể import app cho smoke test
- [x] Frontend API client `shopApi`
- [x] Frontend API client `sellerApi`
- [x] Route group `/seller/*`
- [x] `SellerLayout`
- [x] Sidebar seller
- [x] Protected route role `seller/admin`
- [x] `SellerDashboard` dùng endpoint thống kê seller
- [x] `SellerProducts` có search/filter trạng thái/danh mục
- [x] `SellerProductForm`
- [x] `SellerOrders` có search/filter trạng thái
- [x] `SellerShopSettings`
- [x] `SellerRegister`
- [x] `SellerRevenue` có cards tổng hợp và bảng đơn tính doanh thu
- [x] Seller xem danh sách sản phẩm
- [x] Seller thêm sản phẩm
- [x] Seller sửa sản phẩm
- [x] Seller ẩn sản phẩm
- [x] Seller xem danh sách đơn hàng
- [x] Seller xác nhận đơn hàng
- [x] Seller chuyển đơn sang đóng gói
- [x] Seller cập nhật thông tin gian hàng

Đã kiểm tra:

- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`
- [x] `node --check backend/src/controllers/order.controller.js`
- [x] `node --check backend/src/routes/sellerOrder.routes.js`
- [x] Smoke test seller stats API:
  - login seller
  - `GET /api/seller/orders/stats`
  - kết quả HTTP `200`

Còn lại sau Phase 5:

- [ ] Test thủ công thêm/sửa/ẩn sản phẩm trên browser người dùng
- [ ] Test thủ công xác nhận/đóng gói đơn trên browser người dùng
- [x] Làm Phase 6 Admin Dashboard

---

## 13. Cập nhật Phase 6 - 28/06/2026

**Trạng thái:** Hoàn thành MVP  
**Mức hoàn thành Phase 6 hiện tại:** 100% theo phạm vi MVP trong roadmap

Đã hoàn thành:

- [x] Backend `GET /api/admin/stats`
- [x] Backend `GET /api/admin/shops`
- [x] Backend `PUT /api/admin/shops/:id/approve`
- [x] Backend `PUT /api/admin/shops/:id/suspend`
- [x] Backend `GET /api/admin/users`
- [x] Backend `PUT /api/admin/users/:id/status`
- [x] Backend `GET /api/admin/orders`
- [x] Backend `PUT /api/admin/orders/:id/status`
- [x] Frontend API client `adminApi`
- [x] Route group `/admin/*`
- [x] Protected route role `admin`
- [x] `AdminLayout`
- [x] `AdminDashboard`
- [x] `AdminShops`
- [x] `AdminUsers`
- [x] `AdminOrders`
- [x] Header hiển thị link `Quản trị` cho admin
- [x] Seed tài khoản admin test

Tài khoản test:

```text
admin-test@example.com / 123456
```

Đã kiểm tra:

- [x] `npm.cmd run seed`
- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`
- [x] `node --check backend/src/controllers/admin.controller.js`
- [x] `node --check backend/src/routes/admin.routes.js`
- [x] Smoke test admin API:
  - login admin
  - `GET /api/admin/stats`
  - `GET /api/admin/shops`
  - kết quả HTTP `200`

Còn lại sau Phase 6:

- [ ] Test thủ công admin dashboard trên browser
- [ ] Bổ sung top shop/export CSV nếu cần báo cáo sâu hơn
- [x] Bắt đầu Phase 7: upload ảnh, shipping estimator, email fallback

---

## 14. Cập nhật Phase 7 - 28/06/2026

**Trạng thái:** Đang làm MVP  
**Mức hoàn thành Phase 7 hiện tại:** khoảng 70% theo phạm vi Phase 7 đầy đủ

Đã hoàn thành:

- [x] Backend static uploads tại `/uploads`
- [x] Backend `POST /api/uploads/image`
- [x] Validate upload chỉ nhận image
- [x] Giới hạn file upload 5MB
- [x] Cloudinary upload provider bằng backend env, không đưa secret ra frontend
- [x] Fallback local upload khi chưa cấu hình Cloudinary
- [x] Xóa file tạm local sau khi upload Cloudinary thành công/thất bại
- [x] Trả `provider` trong response upload để phân biệt `local`/`cloudinary`
- [x] Frontend API client `uploadApi`
- [x] Seller upload ảnh sản phẩm trong `SellerProductForm`
- [x] Seller upload logo/banner trong `SellerShopSettings`
- [x] Vite proxy `/uploads` sang backend local
- [x] Backend `GET/POST /api/shipping/estimate`
- [x] Shipping estimator MVP theo thành phố và giá trị đơn
- [x] Checkout hiển thị phí vận chuyển dự kiến
- [x] Checkout vô hiệu hóa MoMo/VNPay để tránh hiểu nhầm là đã thanh toán thật
- [x] Checkout hỗ trợ chọn `Chuyển khoản ngân hàng (VietQR)`
- [x] Backend `POST /api/payment/vietqr`
- [x] Frontend component `PaymentQR`
- [x] API key VietQR chỉ đọc từ backend env, không đưa vào React
- [x] Smoke test VietQR end-to-end qua API: login buyer, tạo đơn bank transfer, gọi VietQR.io, nhận QR, hủy đơn test để hoàn kho
- [x] Backend email service dùng Nodemailer
- [x] Email fallback log khi chưa có `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
- [x] Template HTML cho email hệ thống
- [x] Gửi email chào mừng khi đăng ký tài khoản
- [x] Gửi email xác nhận khi đăng ký gian hàng
- [x] Gửi email xác nhận đơn qua service fallback
- [x] Gửi email cập nhật trạng thái đơn qua service fallback

Đã kiểm tra:

- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`
- [x] `node --check backend/src/controllers/upload.controller.js`
- [x] `node --check backend/src/routes/upload.routes.js`
- [x] `node --check backend/src/services/shipping.service.js`
- [x] `node --check backend/src/services/email.service.js`
- [x] Smoke test shipping API:
  - `POST /api/shipping/estimate`
  - kết quả HTTP `200`
- [x] Smoke test upload API:
  - login seller
  - `POST /api/uploads/image`
  - kết quả HTTP `201`
- [x] Smoke test VietQR route:
  - login buyer
  - `GET /api/orders`
  - `POST /api/payment/vietqr`
- [x] Test VietQR API thật:
  - tạo được `qrDataURL` từ VietQR.io
  - cấu hình ngân hàng trong `backend/.env` được backend đọc đúng
- [x] Smoke test VietQR end-to-end:
  - `npm.cmd run smoke:vietqr` trong thư mục `backend`
  - login buyer test
  - tạo đơn `bank_transfer`
  - gọi `POST /api/payment/vietqr/:orderId`
  - nhận `qrDataURL` dạng `data:image/png;base64,`
  - hủy đơn test sau khi kiểm tra để hoàn kho

Còn lại để hoàn thiện Phase 7 đầy đủ:

- [x] Cấu hình code Cloudinary và chuyển upload sang cloud khi có credential
- [ ] Smoke test Cloudinary thật với `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- [ ] Cấu hình SMTP thật hoặc SendGrid
- [x] Điền `VIETQR_CLIENT_ID`, `VIETQR_API_KEY`, `BANK_ACCOUNT_NO`, `BANK_ACCOUNT_NAME`, `BANK_ACQ_ID` trong `backend/.env`
- [x] Test VietQR API thật: tạo được `qrDataURL` từ VietQR.io
- [x] Test VietQR end-to-end qua API với đơn hàng thật
- [x] Email đăng ký tài khoản/gian hàng
- [x] Template HTML cho email
- [ ] MoMo sandbox
- [ ] VNPay sandbox
- [ ] GHN/GHTK sandbox
- [ ] Tạo vận đơn thật
- [ ] Tracking đơn hàng thật

---

## 15. Cập nhật Phase 8 - 28/06/2026

**Trạng thái:** Đang làm MVP  
**Mức hoàn thành Phase 8 hiện tại:** khoảng 65% theo phạm vi Phase 8 đầy đủ

Đã hoàn thành:

- [x] Lazy loading route pages bằng `React.lazy`
- [x] `Suspense` fallback khi chuyển trang
- [x] Code splitting theo route trong Vite build
- [x] Metadata SEO cơ bản trong `index.html`
- [x] Cập nhật `lang="vi"`
- [x] Cập nhật title/description theo route bằng `PageMetadata`
- [x] Backend rate limit MVP cho `/api`
- [x] Header rate-limit: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- [x] Backend gzip compression MVP cho JSON/text/html/css/js
- [x] Bỏ qua compression cho `/uploads` để tránh buffer ảnh tĩnh
- [x] Gắn `X-Request-Id` cho mỗi request
- [x] Logging request dạng JSON có `requestId`, method, path, status, duration
- [x] Error response thống nhất toàn backend, vẫn giữ `message` top-level cho frontend
- [x] Error payload có `error.code`, `error.status`, `error.path`, `error.requestId`, `error.timestamp`
- [x] Unit test `cartStore` bằng Node built-in test runner
- [x] Unit test utility functions cho format tiền, tính tổng dòng, tổng đơn và nhãn trạng thái
- [x] Tách utility format/tính toán dùng lại ở cart, checkout, orders, product card và VietQR payment card
- [x] API collection Postman cho Auth, Buyer, Seller, Admin, Upload, Shipping, VietQR
- [x] Postman environment local cho `baseUrl`, token và biến id test
- [x] CORS production qua `CLIENT_URL` và `CORS_ORIGINS`
- [x] GitHub Actions CI chạy install, test, lint, build và backend syntax check

Đã kiểm tra:

- [x] `npm.cmd run lint`
- [x] `npm.cmd test`
- [x] `npm.cmd run build`
- [x] Validate Postman collection/environment JSON
- [x] Unit test upload provider config
- [x] Unit test CORS allowlist production
- [x] `node --check backend/src/middleware/compression.js`
- [x] `node --check backend/src/middleware/rateLimit.js`
- [x] `node --check backend/src/middleware/requestContext.js`
- [x] `node --check backend/src/middleware/requestLogger.js`
- [x] `node --check backend/src/middleware/errorResponse.js`
- [x] `node --check backend/src/app.js`
- [x] Smoke test:
  - `GET /health`
  - `POST /api/shipping/estimate`
  - gzip response có `Content-Encoding: gzip`
  - rate limit header có `X-RateLimit-Limit: 300`
- [x] Smoke test error/logging:
  - `GET /api/not-found` trả `404` với error format thống nhất
  - `GET /api/orders` chưa đăng nhập trả `401` với `requestId`
  - response header có `X-Request-Id`

Còn lại để hoàn thiện Phase 8 đầy đủ:

- [ ] Tối ưu ảnh thật/CDN
- [ ] Lighthouse Performance >= 90 trên browser thật
- [ ] Lighthouse SEO >= 90 trên browser thật
- [x] Unit test cartStore
- [x] Unit test utility functions
- [x] API collection Postman/Thunder Client
- [ ] E2E test luồng mua hàng
- [ ] E2E test luồng seller/admin
- [x] Error response format thống nhất toàn backend
- [x] Logging production tốt hơn
- [ ] Deploy frontend Vercel
- [ ] Deploy backend Railway/Render
- [ ] PostgreSQL/Redis production
- [x] CORS production
- [x] CI/CD GitHub Actions

---

## 16. Cập nhật Phase 7 - Email template và email đăng ký - 28/06/2026

**Trạng thái:** Hoàn thành phần email đăng ký và HTML template theo phạm vi MVP  
**Phạm vi:** Tiếp tục Phase 7 ở các mục không cần credential bên thứ ba mới

Đã hoàn thành:

- [x] Mở rộng `backend/src/services/email.service.js` để hỗ trợ cả `text` và `html`
- [x] Thêm HTML template dùng chung cho email hệ thống
- [x] Escape nội dung động trước khi đưa vào HTML email
- [x] Email xác nhận đơn hàng dùng HTML template
- [x] Email cập nhật trạng thái đơn hàng dùng HTML template
- [x] Email chào mừng khi người dùng đăng ký tài khoản
- [x] Email xác nhận khi người dùng đăng ký gian hàng
- [x] Giữ fallback log `[email:dev]` khi chưa cấu hình SMTP thật
- [x] Bổ sung biến SMTP vào `backend/.env.example`

Đã kiểm tra:

- [x] `node --check backend/src/services/email.service.js`
- [x] `node --check backend/src/controllers/auth.controller.js`
- [x] `node --check backend/src/controllers/shop.controller.js`
- [x] Smoke test email fallback cho welcome email và shop registration email
- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`

Ghi chú:

- Chưa gửi email thật ra ngoài vì hiện chưa có `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`.
- Khi có SMTP thật hoặc SendGrid, chỉ cần điền biến môi trường, không cần đổi logic gửi email.

---

## 17. Cập nhật Phase 8 - Logging và error format backend - 28/06/2026

**Trạng thái:** Hoàn thành phần request logging và error format thống nhất theo phạm vi MVP  
**Phạm vi:** Nâng production-readiness backend, không thay đổi luồng nghiệp vụ chính

Đã hoàn thành:

- [x] Thêm `backend/src/middleware/requestContext.js`
- [x] Mỗi request có `requestId` riêng
- [x] Response header có `X-Request-Id`
- [x] Thêm `backend/src/middleware/requestLogger.js`
- [x] Log request dạng JSON gồm `requestId`, method, path, status, duration, ip, userId nếu có
- [x] Thêm `backend/src/middleware/errorResponse.js`
- [x] Chuẩn hóa lỗi 4xx/5xx về cấu trúc:
  - `message`
  - `error.code`
  - `error.status`
  - `error.method`
  - `error.path`
  - `error.requestId`
  - `error.timestamp`
- [x] Giữ `message` top-level để frontend hiện tại vẫn đọc lỗi bằng `err.response?.data?.message`
- [x] Thay error handler cũ trong `backend/src/app.js` bằng middleware tập trung
- [x] Bỏ `morgan('dev')` khỏi runtime để tránh log trùng, dùng request logger nội bộ thay thế

Đã kiểm tra:

- [x] `node --check backend/src/middleware/requestContext.js`
- [x] `node --check backend/src/middleware/requestLogger.js`
- [x] `node --check backend/src/middleware/errorResponse.js`
- [x] `node --check backend/src/app.js`
- [x] Smoke test `/health` trả `200` và có `X-Request-Id`
- [x] Smoke test `/api/not-found` trả `404` với error format thống nhất
- [x] Smoke test `/api/orders` khi chưa đăng nhập trả `401` với `error.requestId`
- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`

Ghi chú:

- Format lỗi mới tương thích ngược với frontend hiện tại vì vẫn giữ `message`.
- Log hiện ghi ra `stdout` dạng JSON, phù hợp để Railway/Render/Vercel log collector đọc ở bước deploy.

---

## 18. Cập nhật Phase 8 - Unit test cartStore - 28/06/2026

**Trạng thái:** Hoàn thành unit test đầu tiên cho frontend state  
**Phạm vi:** Bổ sung testing tự động không cần thêm dependency

Đã hoàn thành:

- [x] Thêm script `npm.cmd test`
- [x] Thêm cấu hình ESLint cho thư mục `tests`
- [x] Thêm `tests/cartStore.test.js`
- [x] Test thêm sản phẩm với quantity mặc định
- [x] Test cộng dồn sản phẩm trùng
- [x] Test cập nhật quantity
- [x] Test không nhận quantity nhỏ hơn 1
- [x] Test xóa item và clear cart
- [x] Test `totalItems()`
- [x] Test `totalPrice()`
- [x] Điều chỉnh `cartStore` dùng `createJSONStorage(() => globalThis.localStorage)` để persist chạy ổn định hơn trong browser và test runtime

Đã kiểm tra:

- [x] `npm.cmd test`
- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`

Ghi chú:

- Test runner dùng `node:test`, không thêm thư viện test mới.
- `cartStore` vẫn giữ API cũ, không đổi cách các component đang gọi.

---

## 19. Cập nhật Phase 8 - Utility functions và unit test - 28/06/2026

**Trạng thái:** Hoàn thành unit test utility functions theo phạm vi MVP  
**Phạm vi:** Tách logic format/tính toán lặp lại ở frontend thành utility dùng chung

Đã hoàn thành:

- [x] Thêm `src/utils/format.js`
- [x] Thêm `toNumber`
- [x] Thêm `formatVnd`
- [x] Thêm `getProductPrice`
- [x] Thêm `calculateLineTotal`
- [x] Thêm `calculateOrderTotal`
- [x] Thêm `formatStatusLabel`
- [x] `cartStore` dùng `calculateLineTotal` cho `totalPrice`
- [x] `CartPage` dùng `formatVnd`
- [x] `CheckoutPage` dùng `formatVnd` và `calculateLineTotal`
- [x] `OrdersPage` dùng `calculateOrderTotal`, `calculateLineTotal`, `formatVnd`, `formatStatusLabel`
- [x] `ProductCard` dùng `formatVnd`, `getProductPrice`, `toNumber`
- [x] `PaymentQR` dùng `formatVnd`, `toNumber`
- [x] Thêm `tests/format.test.js`

Đã kiểm tra:

- [x] `npm.cmd test`
  - 11 tests
  - 2 suites
  - 11 passed
- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`

Ghi chú:

- Test utility dùng `node:test`, không thêm dependency mới.
- Các thay đổi frontend chỉ chuẩn hóa format/tính toán, không đổi hành vi nghiệp vụ.

---

## 20. Cập nhật Phase 8 - API collection Postman - 28/06/2026

**Trạng thái:** Hoàn thành API collection theo phạm vi MVP  
**Phạm vi:** Tạo bộ request import được vào Postman để test API local có hệ thống

Đã hoàn thành:

- [x] Thêm `docs/api/SouvenirShop.postman_collection.json`
- [x] Thêm `docs/api/SouvenirShop.local.postman_environment.json`
- [x] Thêm `docs/api/README.md`
- [x] Collection nhóm `Health`
- [x] Collection nhóm `Auth`
- [x] Collection nhóm `Buyer`
- [x] Collection nhóm `Seller`
- [x] Collection nhóm `Admin`
- [x] Request login buyer/seller/admin tự lưu token vào environment
- [x] Request product list tự lưu `productId` và `shopSlug`
- [x] Request tạo đơn buyer tự lưu `orderId`
- [x] Request VietQR dùng `orderId`
- [x] Request hủy đơn test để hoàn kho sau khi test
- [x] Environment local có `baseUrl`, token và biến id thường dùng

Đã kiểm tra:

- [x] Parse JSON collection bằng Node thành công
- [x] Parse JSON environment bằng Node thành công
- [x] `npm.cmd test`
- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`

Ghi chú:

- Collection dùng backend local `http://localhost:3000`.
- Một số request admin cần điền thủ công `shopId` hoặc `userId` nếu muốn thao tác bản ghi cụ thể.
- Request upload ảnh cần chọn file trong Postman form-data trước khi gửi.

---

## 21. Cập nhật Phase 8 - Frontend custom hooks - 30/06/2026

**Trạng thái:** Bắt đầu xử lý checklist đánh giá frontend  
**Phạm vi:** Tách logic khỏi component trước, chưa đổi framework/router hoặc thêm dependency test mới

Đã hoàn thành:

- [x] Thêm thư mục `src/hooks`
- [x] Thêm `src/hooks/useProductList.js`
- [x] Tách state URL filter, query sản phẩm, phân trang và add-to-cart khỏi `ProductListPage`
- [x] Thêm `src/hooks/productList.helpers.js` để test logic lọc URL không phụ thuộc React/browser
- [x] Thêm `src/hooks/useSellerProducts.js`
- [x] Tách state search/status/category, query seller products và mutation ẩn/khôi phục/xóa khỏi `SellerProducts`
- [x] Thêm `src/hooks/sellerProducts.helpers.js` để test logic lọc/danh mục seller products
- [x] Thêm `tests/productListHook.test.js`
- [x] Thêm `tests/sellerProductsHook.test.js`
- [x] Thêm `src/hooks/useCheckout.js`
- [x] Tách state form, shipping estimate, mutation tạo đơn và điều hướng khỏi `CheckoutPage`
- [x] Thêm `src/hooks/checkout.helpers.js` để test validation, payload đặt hàng và copy trạng thái
- [x] Thêm `tests/checkoutHook.test.js`
- [x] Thêm `src/hooks/useSellerProductForm.js`
- [x] Tách query sản phẩm, upload ảnh, tạo/sửa sản phẩm và điều hướng khỏi `SellerProductForm`
- [x] Thêm `src/hooks/sellerProductForm.helpers.js` để test payload sản phẩm và gán URL upload
- [x] Thêm `tests/sellerProductFormHook.test.js`
- [x] Thêm `src/hooks/useSellerShopSettings.js`
- [x] Tách query shop, upload logo/banner và cập nhật gian hàng khỏi `SellerShopSettings`
- [x] Thêm `src/hooks/shopSettings.helpers.js` để test payload cài đặt shop và gán URL upload
- [x] Thêm `tests/shopSettingsHook.test.js`
- [x] Thêm `src/hooks/useSellerRegister.js`
- [x] Tách state/mutation đăng ký gian hàng khỏi `SellerRegister`
- [x] Thêm `src/hooks/sellerRegister.helpers.js` và `tests/sellerRegisterHook.test.js`
- [x] Thêm `src/hooks/useLoginForm.js`
- [x] Tách state/validation/request đăng nhập-đăng ký khỏi `LoginPage`
- [x] Thêm `src/hooks/loginForm.helpers.js` và `tests/loginFormHook.test.js`
- [x] Thêm `src/hooks/useProfileForms.js`
- [x] Tách state form hồ sơ, địa chỉ và đổi mật khẩu khỏi `ProfilePage`
- [x] Thêm `src/hooks/profile.helpers.js` và `tests/profileHook.test.js`

Đã kiểm tra:

- [x] `npm.cmd test`
  - 42 tests
  - 12 suites
  - 42 passed
- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`

Còn lại theo đánh giá frontend:

- [x] Tách `CheckoutPage` sang custom hook
- [x] Tách `SellerProductForm` và `SellerShopSettings` sang custom hooks
- [x] Tách `SellerRegister`, `LoginPage`, `ProfilePage` sang custom hooks
- [x] Kết nối API thật cho profile/address/password thay vì local mock/TODO
- [x] Chuẩn hóa `Header.module.css` và `HomePage.module.css` sang Tailwind hoặc một chuẩn thống nhất
- [ ] Bổ sung component tests hoặc E2E tests bằng công cụ chuyên dụng khi cho phép thêm dependency
- [ ] Đánh giá migration TypeScript theo từng module thay vì đổi toàn bộ một lần
- [ ] Chỉ cân nhắc React Router Data Router sau khi ổn định test và hooks

---

## 22. Cập nhật Phase 8 - Chuẩn hóa styling frontend - 30/06/2026

**Trạng thái:** Hoàn thành phần loại bỏ CSS Modules còn lại  
**Phạm vi:** Chuẩn hóa styling hiện có về Tailwind, không đổi layout/luồng nghiệp vụ

Đã hoàn thành:

- [x] Chuyển `Header.jsx` từ CSS Module sang Tailwind class trực tiếp
- [x] Giữ responsive desktop/mobile header, user dropdown, cart badge và mobile menu
- [x] Xóa `src/components/Header.module.css`
- [x] Xóa `src/pages/HomePage.module.css` vì không còn được import
- [x] Dọn rule header cũ không còn dùng trong `src/index.css`
- [x] Kiểm tra không còn `*.module.css` hoặc `styles.*` trong `src`

Đã kiểm tra:

- [x] `npm.cmd test`
  - 42 tests
  - 12 suites
  - 42 passed
- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`

---

## 23. Cập nhật Phase 8 - Profile API thật - 30/06/2026

**Trạng thái:** Hoàn thành kết nối profile/address/password với API thật  
**Phạm vi:** Thay mock/TODO trong `ProfilePage`, bổ sung endpoint đổi mật khẩu còn thiếu

Đã hoàn thành:

- [x] Thêm frontend API client `src/api/userApi.js`
- [x] `ProfilePage` gọi `GET /api/users/profile` để lấy hồ sơ hiện tại
- [x] `ProfilePage` gọi `PUT /api/users/profile` để cập nhật tên/số điện thoại
- [x] `ProfilePage` gọi `GET /api/users/addresses` để lấy địa chỉ thật từ database
- [x] `ProfilePage` gọi `POST /api/users/addresses` để thêm địa chỉ
- [x] `ProfilePage` gọi `PUT /api/users/addresses/:id` để sửa địa chỉ
- [x] `ProfilePage` gọi `DELETE /api/users/addresses/:id` để xóa địa chỉ
- [x] Thêm `PUT /api/users/password` ở backend
- [x] Đổi mật khẩu kiểm tra mật khẩu hiện tại bằng `bcrypt.compare`
- [x] Mật khẩu mới được hash bằng `bcrypt.hash(..., 12)`
- [x] Cập nhật `useProfileForms` từ local mock sang React Query mutation/query
- [x] Cập nhật helper/test profile theo payload API thật

Đã kiểm tra:

- [x] `node --check backend/src/controllers/user.controller.js`
- [x] `node --check backend/src/routes/user.routes.js`
- [x] `npm.cmd test`
  - 42 tests
  - 12 suites
  - 42 passed
- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`

Ghi chú:

- Lần chạy build song song với test/lint có lỗi Vite/Rolldown emit path trên Windows, nhưng chạy `npm.cmd run build` riêng ngay sau đó đã pass.
- Avatar upload trên profile vẫn chưa nối UI thật; phần upload cloud/local đã có ở backend nhưng tab profile chưa gửi avatar.
