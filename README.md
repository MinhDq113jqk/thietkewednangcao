# BÁO CÁO BÀI TẬP NHÓM - THIẾT KẾ WEB NÂNG CAO

## 1. Thông tin chung & Thành viên nhóm

- **Tên đề tài:** SouvenirShop - Nền tảng Marketplace quà lưu niệm Việt Nam
- **Link Git Repo:** [https://github.com/MinhDq113jqk/thietkewednangcao](https://github.com/MinhDq113jqk/thietkewednangcao)
- **Danh sách thành viên & Phân công CRUD:**

| STT | Họ và tên | MSSV | GitHub Username | Đối tượng phụ trách CRUD | Trách nhiệm chính |
| :---: | :--- | :---: | :---: | :---: | :--- |
| 1 | Dương Quang Minh (Nhóm trưởng) | 23010567 | `MinhDq113jqk` | **Product** (Sản phẩm) | Khởi tạo repo, cấu hình `.devcontainer`, CRUD Sản phẩm |
| 2 | *Thành viên 2* | *MSSV* | *Username* | **User** (Người dùng) | Thiết kế bảng dữ liệu, cấu hình DB, CRUD Người dùng |
| 3 | *Thành viên 3* | *MSSV* | *Username* | **Shop** (Gian hàng) | Viết module kết nối CSDL `dbconnection.js`, CRUD Shop |
| 4 | *Thành viên 4* | *MSSV* | *Username* | **Order** (Đơn hàng) | Viết script test/demo CRUD, CRUD Đơn hàng & Báo cáo |

---

## 2. Trả lời các yêu cầu bài tập

### Yêu cầu 1: Môi trường chung phát triển ứng dụng cho cả nhóm
- **Git Repo:** Đã khởi tạo và làm việc tại `https://github.com/MinhDq113jqk/thietkewednangcao`.
- **Collaborators:** Đã thêm các thành viên vào nhóm cộng tác trên GitHub.
- **Framework của Repo (`.devcontainer`):** Đã xây dựng thư mục `.devcontainer/` chứa:
  - `devcontainer.json`: Cấu hình môi trường Node.js 20, extension VS Code và mở các port 3000, 5173, 5432.
  - `docker-compose.yml`: Đồng bộ service container Node.js và PostgreSQL 16 cho toàn bộ thành viên.

### Yêu cầu 2: Đã có file `.sql`
- Toàn bộ câu lệnh DDL tạo bảng và dữ liệu mẫu DML đã được lưu tại:
  - `database.sql` (ở thư mục gốc repo) và `source/backend/database.sql`.
  - Bao gồm 13 bảng: `users`, `shops`, `regions`, `craft_villages`, `products`, `orders`, `order_items`, `addresses`, `reviews`,...

### Yêu cầu 3: Đã có hệ quản trị CSDL
- Sử dụng hệ quản trị CSDL: **PostgreSQL (pgAdmin 4)**.
- Database: `souvenirshop`.
- **Ảnh chụp màn hình minh chứng Câu 3 (Cấu trúc DB & Danh sách bảng trong pgAdmin):**

![Ảnh chụp màn hình Hệ quản trị CSDL Câu 3](image-2.png)

### Yêu cầu 4: Tạo file `dbconnection.js`
- Đã tạo file `dbconnection.js` tại thư mục gốc và `source/backend/dbconnection.js`.
- Chạy kiểm tra kết nối độc lập qua lệnh: `node dbconnection.js`.
- **Ảnh chụp màn hình minh chứng Câu 4 (Chạy test kết nối thành công):**

![Ảnh chụp màn hình kết nối DB Câu 4](image.png)

### Yêu cầu 5: Tạo CRUD cho từng đối tượng yêu cầu của sinh viên
- Hệ thống mã nguồn CRUD hoàn chỉnh theo kiến trúc MVC trong `source/backend/src/` (Controllers, Routes, Models).
- Kèm script thực thi tự động `crud_demo.js` (hỗ trợ cờ `--sv1`, `--sv2`, `--sv3`, `--sv4`).
- **Ảnh chụp màn hình minh chứng Câu 5 (Kết quả thực thi CRUD):**

#### Sinh viên 1: CRUD Product (Sản phẩm)
![CRUD Product](image-1.png)

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
