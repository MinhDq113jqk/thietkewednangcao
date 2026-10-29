# Môi trường phát triển

`compose.yaml` ở thư mục gốc chạy PostgreSQL 16. `devcontainer.compose.yaml` bổ sung môi trường Node.js 24 cho VS Code Dev Containers. Đường dẫn volume tính từ tệp Compose đầu tiên ở thư mục gốc.

## PostgreSQL qua Docker

```powershell
docker compose up -d db
npm --prefix backend run env:local
```

`backend/.env` trong repo đã khớp với PostgreSQL mặc định của Compose. Nếu đổi cấu hình database, cập nhật `DATABASE_URL`, sau đó chạy migration theo README. Thông tin riêng đặt trong `backend/.env.local`; backend ưu tiên tệp này hơn `.env`. Có thể sao chép `.env.example` ở thư mục gốc thành `.env` để đổi cấu hình container local. Nếu cổng 5432 đã được dùng, chọn cổng khác qua `POSTGRES_PORT` và cập nhật cổng trong `DATABASE_URL`.

## Dev Container

Mở dự án trong VS Code và chọn **Dev Containers: Reopen in Container**. Dev Container cài hai gói frontend/backend, tạo cấu hình local nếu chưa có, chạy migration và build NestJS.

Đây là cấu hình phát triển. Môi trường công khai cần cấu hình HTTPS, thông tin kết nối riêng, sao lưu và giám sát.
