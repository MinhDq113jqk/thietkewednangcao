# SouvenirShop

## 1. Giới thiệu dự án

**SouvenirShop** là website mua bán quà lưu niệm Việt Nam, được xây dựng phục vụ học phần **Thiết kế Web nâng cao**.

**Công nghệ sử dụng:**
- Frontend: React, React-Bootstrap, Vite.
- Backend: NestJS, Sequelize.
- Database: PostgreSQL.

**GitHub:** https://github.com/MinhDq113jqk/thietkewednangcao

## 2. Thành viên thực hiện

**Họ và tên:** Dương Quang Minh

**Mã sinh viên:** 23010567

**GitHub:** MinhDq113jqk

## 3. Hướng dẫn cài đặt và chạy dự án

### Bước 1: Yêu cầu môi trường

Cài đặt các công cụ sau:
- Node.js 24 và npm
- PostgreSQL 16 trở lên
- Git
- Docker (tùy chọn)

### Bước 2: Tải mã nguồn

Mở Terminal và chạy:

```bash
git clone https://github.com/MinhDq113jqk/thietkewednangcao.git
cd thietkewednangcao
```

### Bước 3: Cài đặt thư viện

```bash
npm --prefix frontend ci
npm --prefix backend ci
```

### Bước 4: Cấu hình cơ sở dữ liệu

Tạo cấu hình môi trường:

```bash
npm --prefix backend run env:local
```

Đảm bảo PostgreSQL đang chạy. Có thể sử dụng Docker:

```bash
docker compose up -d db
```

Nếu sử dụng PostgreSQL trên máy, cấu hình kết nối trong `backend/.env` hoặc `backend/.env.local`, đồng thời tạo database `souvenirshop`.

Khởi tạo cấu trúc database:

```bash
npm --prefix backend run migrate
npm --prefix backend run db:check
```

Thêm dữ liệu minh họa (tùy chọn):

```bash
npm --prefix backend run seed:demo
```

### Bước 5: Khởi chạy dự án

Mở hai Terminal tại thư mục gốc của dự án.

**Terminal 1 – Backend:**

```bash
npm --prefix backend run dev
```

Backend chạy tại: http://localhost:3000

**Terminal 2 – Frontend:**

```bash
npm --prefix frontend run dev
```

Frontend chạy tại: http://127.0.0.1:5173

### Bước 6: Truy cập website

Mở trình duyệt và truy cập:

**http://127.0.0.1:5173**

Sau khi hoàn thành các bước trên, có thể sử dụng và trải nghiệm website SouvenirShop trên máy tính cá nhân.