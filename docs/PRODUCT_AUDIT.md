# Tự đánh giá sản phẩm SouvenirShop

Ngày đánh giá: 25/07/2026

## Kết luận

SouvenirShop đạt mức **MVP thương mại điện tử hoàn chỉnh để chạy local, demo luận văn và pilot nội bộ với dữ liệu thử nghiệm**. Chưa nên nhận tiền thật ở production cho đến khi hoàn tất webhook đối soát thanh toán, API hãng vận chuyển, giám sát vận hành và quy trình sao lưu.

## Điểm số

| Hạng mục | Điểm | Nhận xét |
|---|---:|---|
| Luồng người mua | 9.0/10 | Tìm kiếm, lọc, chi tiết, giỏ hàng, checkout, đơn hàng và hồ sơ đã nối liền. |
| Gợi ý sản phẩm | 8.5/10 | Kết hợp ngữ cảnh sản phẩm, danh mục ẩn danh, lịch sử mua và độ phổ biến; chưa có A/B test hoặc mô hình học máy. |
| Thanh toán | 8.5/10 | COD, VietQR và idempotency bền vững đã có; thiếu webhook xác nhận tiền vào và quy trình hoàn tiền tự động. |
| Đơn hàng và tracking | 9.0/10 | Có timeline, hãng vận chuyển, mã vận đơn, vị trí, ETA và thao tác seller; vị trí hiện được seller cập nhật thủ công. |
| Kênh người bán | 8.5/10 | Quản lý sản phẩm, đơn, giao vận, gian hàng và doanh thu; chưa tích hợp in vận đơn hoặc đối soát hãng vận chuyển. |
| Bảo mật ứng dụng | 9.0/10 | Refresh token HttpOnly, token hash/rotation, rate limit, Helmet, CORS, RBAC, giới hạn body và không có secret thật trong source. |
| UI/UX và responsive | 9.0/10 | Phân cấp rõ, thanh toán nổi bật, trạng thái tải/lỗi/rỗng đầy đủ, desktop/mobile đã kiểm tra bằng Playwright. |
| Kiểm thử và độ tin cậy | 9.0/10 | Unit test, lint, build, API smoke với PostgreSQL thật và visual E2E; chưa có CI hoặc kiểm thử tải dài hạn. |
| Sẵn sàng production | 7.5/10 | Cần dịch vụ ngoài, backup, monitoring, alert, log tập trung và runbook sự cố. |

## Những phần đã sửa sau đánh giá

- Không còn lưu access/refresh token trong `localStorage`; refresh token dùng cookie `HttpOnly`, hash trong database và xoay vòng khi refresh.
- Mọi secret, credential seed và credential smoke chỉ đọc từ biến môi trường.
- Checkout yêu cầu `Idempotency-Key`; cùng khóa và cùng nội dung trả lại đúng đơn cũ, cùng khóa nhưng nội dung khác trả `409`.
- Giỏ trùng dòng được gộp trước khi kiểm kho, tránh trừ kho sai.
- Tracking có lịch sử bất biến theo sự kiện, vị trí hiện tại, carrier, tracking code, ETA, thời điểm giao và trạng thái thanh toán COD.
- Gợi ý ưu tiên sở thích danh mục ẩn danh; không lưu danh tính vào dữ liệu preference phía trình duyệt.
- UI đã bổ sung route chính sách, liên hệ, giới thiệu, 404, trạng thái rỗng/lỗi và điều hướng seller trên mobile.
- Avatar tài khoản không còn gửi tên người dùng tới dịch vụ ảnh bên ngoài.
- Hero được nén từ khoảng 2,23 MB xuống khoảng 159 KB; font chỉ đóng gói subset Latin và tiếng Việt.
- Backend đã nâng Express/body-parser và Nodemailer để loại cảnh báo dependency mức cao.

## Bằng chứng kiểm tra

- `npm.cmd test`: 54/54 test đạt.
- `npm.cmd run lint`: đạt.
- `npm.cmd run build`: đạt.
- `npm.cmd --prefix source/backend run smoke:core`: đạt với health, 401, 404, recommendation, hai checkout đồng thời, replay, conflict, seller tracking, delivery và cancellation.
- Playwright Chromium: đạt ở `1440x1000` và `390x844`, không tràn ngang, không lỗi console/page, font và ảnh hero tải đúng.

## Rủi ro còn lại

1. VietQR hiện tạo nội dung/mã thanh toán nhưng chưa nhận webhook ngân hàng để tự động chuyển `paymentStatus`.
2. Tracking hiện do seller nhập; chưa đồng bộ vị trí từ GHN, GHTK, Viettel Post hoặc đơn vị tương đương.
3. Frontend SPA không dùng React Server Components nhưng `npm audit` vẫn báo advisory React Router liên quan riêng RSC mode; không chạy `--force` vì npm đề xuất downgrade gây breaking change.
4. Sequelize kéo `uuid@8` có advisory mức moderate cho API UUID dùng buffer ở phiên bản v3/v5/v6; dự án chỉ dùng UUIDV4 do Sequelize sinh và không truyền buffer từ người dùng.
5. SMTP production, mailbox hỗ trợ, domain, backup PostgreSQL và monitoring cần được cấu hình, diễn tập bằng credential thật ngoài source.

## Điều kiện để Pilot Ready

- Dùng môi trường staging riêng và dữ liệu giả lập.
- Chạy migration, test, lint, build, smoke và Playwright trong CI.
- Kết nối sandbox của thanh toán và hãng vận chuyển; kiểm tra chữ ký webhook và replay.
- Thiết lập backup/restore PostgreSQL, log tập trung, cảnh báo lỗi và giới hạn upload.
- Chạy test IDOR theo buyer/seller/admin và test tải checkout đồng thời trước khi nhận đơn thật.
