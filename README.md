# BÁO CÁO BÀI TẬP NHÓM - THIẾT KẾ WEB NÂNG CAO

## 1. Thông tin chung & Thành viên nhóm

- **Tên đề tài:** SouvenirShop - Nền tảng Marketplace quà lưu niệm Việt Nam
- **Link Git Repo:** [https://github.com/MinhDq113jqk/thietkewednangcao](https://github.com/MinhDq113jqk/thietkewednangcao)
- **Danh sách thành viên & Phân công CRUD:**

| STT | Họ và tên | MSSV | GitHub Username | Đối tượng phụ trách CRUD | Trách nhiệm chính |
| :---: | :--- | :---: | :---: | :---: | :--- |
| 1 | Dương Quang Minh (Nhóm trưởng) | *Điền MSSV* | `MinhDq113jqk` | **Product** (Sản phẩm) | Khởi tạo repo, cấu hình `.devcontainer`, CRUD Sản phẩm |
| 2 | *Thành viên 2* | *Điền MSSV* | *Username* | **User** (Người dùng) | Thiết kế bảng dữ liệu, cấu hình DB, CRUD Người dùng |
| 3 | *Thành viên 3* | *Điền MSSV* | *Username* | **Shop** (Gian hàng) | Viết module kết nối CSDL `dbconnection.js`, CRUD Shop |
| 4 | *Thành viên 4* | *Điền MSSV* | *Username* | **Order** (Đơn hàng) | Viết script test/demo CRUD, CRUD Đơn hàng & Báo cáo |

---

## 2. Trả lời các yêu cầu bài tập

### Yêu cầu 1: Môi trường chung phát triển ứng dụng cho cả nhóm
- **Git Repo:** Đã khởi tạo và làm việc tại `https://github.com/MinhDq113jqk/thietkewednangcao`.
- **Collaborators:** Đã thêm các thành viên vào nhóm cộng tác trên GitHub.
- **Framework của Repo (`.devcontainer`):** Đã xây dựng thư mục [`.devcontainer/`](file:///.devcontainer) chứa:
  - [`.devcontainer/devcontainer.json`](file:///.devcontainer/devcontainer.json): Cấu hình môi trường Node.js 20, các extension VS Code dùng chung (ESLint, Prettier, Database Client) và mở port 3000, 5173, 5432.
  - [`.devcontainer/docker-compose.yml`](file:///.devcontainer/docker-compose.yml): Đồng bộ container Node.js và PostgreSQL 16 cho toàn bộ thành viên.

### Yêu cầu 2: Đã có file `.sql`
- Toàn bộ câu lệnh DDL tạo bảng và dữ liệu mẫu DML đã được trích xuất vào file:
  - [`database.sql`](file:///database.sql) (tại thư mục gốc repo) và [`source/backend/database.sql`](file:///source/backend/database.sql).
  - Bao gồm các bảng: `users`, `shops`, `regions`, `craft_villages`, `products`, `orders`, `order_items`, `addresses`, `reviews`.

### Yêu cầu 3: Đã có hệ quản trị CSDL
- Sử dụng hệ quản trị CSDL: **PostgreSQL (pgAdmin 4)**.
- Database: `souvenirshop`.
- **Ảnh chụp màn hình minh chứng Câu 3 (Cấu trúc DB & Danh sách bảng trong pgAdmin):**

![Ảnh chụp màn hình Hệ quản trị CSDL Câu 3](docs/evidence/assignment/cau3_database.png)

*(Xem hướng dẫn chụp và lưu ảnh vào đường dẫn `docs/evidence/assignment/cau3_database.png`)*

### Yêu cầu 4: Tạo file `dbconnection.js`
- Đã tạo file [`dbconnection.js`](file:///dbconnection.js) tại thư mục gốc và [`source/backend/dbconnection.js`](file:///source/backend/dbconnection.js).
- File hỗ trợ cả hai chức năng:
  1. Cung cấp kết nối CSDL (Connection Pool / Sequelize) cho toàn bộ ứng dụng.
  2. Chạy test kết nối độc lập qua lệnh: `node dbconnection.js`.
- **Ảnh chụp màn hình minh chứng Câu 4 (Chạy test kết nối thành công):**

![Ảnh chụp màn hình kết nối DB Câu 4](docs/evidence/assignment/cau4_dbconnection.png)

*(Xem hướng dẫn chụp và lưu ảnh vào đường dẫn `docs/evidence/assignment/cau4_dbconnection.png`)*

### Yêu cầu 5: Tạo CRUD cho từng đối tượng yêu cầu của sinh viên
- Hệ thống mã nguồn CRUD hoàn chỉnh theo kiến trúc MVC trong `source/backend/src/`:
  - **Product CRUD:** `controllers/product.controller.js`, `routes/product.routes.js`, `models/Product.js`.
  - **User CRUD:** `controllers/user.controller.js`, `routes/user.routes.js`, `models/User.js`.
  - **Shop CRUD:** `controllers/shop.controller.js`, `routes/shop.routes.js`, `models/Shop.js`.
  - **Order CRUD:** `controllers/order.controller.js`, `routes/order.routes.js`, `models/Order.js`.
- Kèm theo script thực thi tự động trực tiếp [`crud_demo.js`](file:///crud_demo.js) (chạy `node crud_demo.js` hoặc chạy theo từng sinh viên: `node crud_demo.js --sv1`, `--sv2`, `--sv3`, `--sv4`).
- **Ảnh chụp màn hình minh chứng Câu 5 (Kết quả CRUD từng thành viên):**

#### Sinh viên 1: CRUD Product (Sản phẩm)
![CRUD Product](docs/evidence/assignment/cau5_crud_sv1.png)

#### Sinh viên 2: CRUD User (Người dùng)
![CRUD User](docs/evidence/assignment/cau5_crud_sv2.png)

#### Sinh viên 3: CRUD Shop (Gian hàng)
![CRUD Shop](docs/evidence/assignment/cau5_crud_sv3.png)

#### Sinh viên 4: CRUD Order (Đơn hàng)
![CRUD Order](docs/evidence/assignment/cau5_crud_sv4.png)

---

# Giới thiệu dự án SouvenirShop

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
