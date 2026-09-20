# NestJS assignment demo

Thư mục này là backend NestJS độc lập phục vụ bài tập xác thực. SouvenirShop hiện tại vẫn là frontend/demo và backend Express riêng; mã trong thư mục này không thay thế hay sửa các luồng sản phẩm đang có.

## 1. Cài đặt

Mở PowerShell:

```powershell
cd C:\Users\LEGION\myproject\source\nest-assignment
npm.cmd install
Copy-Item .env.example .env
notepad .env
```

Trong `.env`, đổi `CHANGE_ME` thành mật khẩu PostgreSQL thật và thay `JWT_SECRET`, `SESSION_SECRET` bằng hai chuỗi ngẫu nhiên khác nhau. Không chụp màn hình hoặc commit `.env`.

## 2. Tạo database PostgreSQL

Trong pgAdmin, tạo database tên `nest_assignment`. Không cần tự tạo bảng `users`: với `TYPEORM_SYNCHRONIZE=true`, TypeORM tạo bảng cho demo khi ứng dụng khởi động.

Nếu dùng Docker thay cho pgAdmin:

```powershell
docker run --name nest-assignment-postgres -e POSTGRES_PASSWORD=your-local-password -e POSTGRES_DB=nest_assignment -p 5432:5432 -d postgres:16
```

Sau đó cập nhật `DATABASE_URL` trong `.env` cho đúng mật khẩu local.

## 3. Chạy API

```powershell
npm.cmd run start:dev
```

API chạy ở `http://127.0.0.1:3100`.

## 4. Kiểm tra bằng PowerShell

Mở PowerShell thứ hai. Biến `$session` giữ cookie giữa các request, giúp quan sát cả session cookie và JWT cookie.

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ username = "demo_user"; password = "DemoPass123!" } | ConvertTo-Json

Invoke-WebRequest `
  -Uri http://127.0.0.1:3100/auth/register `
  -Method Post `
  -ContentType "application/json" `
  -Body $body `
  -WebSession $session
```

Kết quả mong đợi là HTTP 201, `message: Đăng ký thành công`, `role: user` và phần `session.authenticated: true`. Trong phần Headers phải có `Set-Cookie`; chỉ chụp tên cookie và trạng thái `HttpOnly`, không chụp giá trị token.

Kiểm tra JWT Guard bằng chính `$session`:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:3100/auth/me `
  -Method Get `
  -WebSession $session
```

Kiểm tra Role Guard với tài khoản `user`:

```powershell
try {
  Invoke-WebRequest `
    -Uri http://127.0.0.1:3100/admin/profile `
    -Method Get `
    -WebSession $session
} catch {
  $_.Exception.Response.StatusCode.value__
}
```

Kết quả mong đợi là `403`. Đây là ảnh chứng minh JWT đã nhận diện tài khoản nhưng Role Guard từ chối role `user`.

## 5. Tạo tài khoản admin để chụp ảnh Role Guard thành công

Trong pgAdmin chạy câu lệnh sau, thay username nếu bạn đã dùng tên khác:

```sql
UPDATE users
SET role = 'admin'
WHERE username = 'demo_user';
```

Để cấp JWT mới sau khi đổi role, dùng endpoint đăng nhập (không cần tạo lại user):

```powershell
$loginBody = @{ username = "demo_user"; password = "DemoPass123!" } | ConvertTo-Json
Invoke-WebRequest `
  -Uri http://127.0.0.1:3100/auth/login `
  -Method Post `
  -ContentType "application/json" `
  -Body $loginBody `
  -WebSession $session
```

Sau đó gọi lại:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:3100/admin/profile `
  -Method Get `
  -WebSession $session
```

Kết quả mong đợi là HTTP 200 với thông báo đã vượt qua JWT Guard và Role Guard.

## 6. Ảnh nên chụp cho bài tập

1. `POST /auth/register`: mã 201, username, role và `session.authenticated=true`.
2. Headers của request đăng ký: `Set-Cookie` có cookie HttpOnly; che giá trị token.
3. `GET /auth/me`: mã 200 chứng minh JWT Guard đọc cookie.
4. `GET /admin/profile` với role `user`: mã 403.
5. `GET /admin/profile` với role `admin`: mã 200.
6. Bảng `users` trong pgAdmin: username, role và `passwordHash` dạng bcrypt bắt đầu bằng `$2`; tuyệt đối không chụp mật khẩu gốc hoặc `.env`.

Nếu muốn kiểm tra nhanh phần mã thuần (không cần kết nối PostgreSQL), chạy:

```powershell
npm.cmd test -- --runInBand
```

Bộ test này chỉ kiểm tra DTO, service, controller, JWT strategy và role guard bằng mock; nó không thay thế ảnh chụp API/Database của bài tập.

## Phạm vi demo

- `express-session` đang dùng MemoryStore để minh họa session; không dùng cấu hình này cho production.
- `TYPEORM_SYNCHRONIZE=true` chỉ phù hợp cho bài tập local. Dự án thật nên dùng migration.
- Role mặc định luôn là `user`; không nhận role từ payload đăng ký. Việc nâng role admin được thực hiện thủ công trong database để minh họa Role Guard.
