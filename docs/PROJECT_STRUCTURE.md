# Cấu trúc dự án

## Mã nguồn

- `source/src/`: frontend React/Vite của SouvenirShop.
- `source/public/`: tài nguyên tĩnh của frontend.
- `source/backend/`: API Express/Sequelize và các script migration/seed.
- `source/nest-assignment/`: backend NestJS độc lập phục vụ bài tập xác thực và RBAC.
- `source/tests/`: kiểm thử frontend và smoke/e2e.

## Tài liệu

- `docs/api/`: Postman collection và hướng dẫn kiểm thử API Express.
- `docs/nest-assignment/README.md`: hướng dẫn backend NestJS bài tập.
- `docs/deploy.md`: ghi chú triển khai.
- `docs/PRODUCT_AUDIT.md`: kiểm tra sản phẩm.
- `docs/SouvenirShop_Roadmap_CapNhat.md`: roadmap dự án.
- `docs/evidence/artifacts/`: ảnh minh chứng kiểm thử Playwright.

## Chỉ dùng local, không commit

- `source/node_modules/`, `source/backend/node_modules/`, `source/nest-assignment/node_modules/`: dependency đã cài.
- `source/dist/`: output build, có thể tạo lại bằng `npm.cmd run build`.
- `source/.env` và `source/backend/.env`: secret/cấu hình local.
- `source/backend/uploads/`: dữ liệu upload local; chỉ xóa khi đã xác nhận đó là dữ liệu thử nghiệm.
