# SouvenirShop - Agent Collaboration Guide (Codex + Antigravity)

Tài liệu hướng dẫn phối hợp tự động giữa **Codex** (Local Executor) và **Antigravity** (Chief Architect & Advisory Specialist).

---

## 1. Tổng quan Dự án (SouvenirShop)
- **Mục tiêu:** Marketplace quà lưu niệm Việt Nam cho người mua trong và ngoài nước; kênh bán hàng cho hộ gia đình, làng nghề, nghệ nhân và xưởng sản xuất.
- **Tech Stack:**
  - **Frontend:** React 19, Vite 8, React Router, TanStack Query, Zustand, Tailwind CSS.
  - **Backend:** Node.js, Express, Sequelize ORM.
  - **Database:** PostgreSQL (có migration & seed script).
- **Kiểm thử:** Node test runner (`node --test`), Playwright e2e.
- **Layout:** mã nguồn chạy được nằm trong `source/`; tài liệu và evidence nằm trong `docs/`.

---

## 2. Phân công Vai trò

### 🛠️ Codex Client (Local Worker & Executor)
- Trực tiếp quét cấu trúc file, đọc code, tạo và chỉnh sửa file trong thư mục dự án; các lệnh Node frontend chạy từ `source/`.
- Thực thi các lệnh terminal từ `source/`: `npm run dev`, `npm test`, `npm --prefix backend run migrate`, và cài đặt gói.
- Đóng vai trò thu thập ngữ cảnh code và kích hoạt các công cụ `antigravity_*` để trao đổi với Antigravity.

### 🧠 Antigravity (Chief Architect & Specialized Advisors)
- Tiếp nhận yêu cầu và ngữ cảnh từ Codex qua các công cụ MCP để phân tích chuyên sâu:
  - `antigravity_consult`: Giải thích luồng dữ liệu phức tạp, đưa ra quyết định kiến trúc.
  - `antigravity_plan`: Lập Implementation Plan chi tiết theo chuẩn DeepMind trước khi code tính năng mới.
  - `antigravity_review_backend`: Soi xét bảo mật (SQLi, Auth/RBAC, CSRF), xử lý transaction và tối ưu truy vấn Sequelize.
  - `antigravity_create_frontend`: Sinh component/trang React 19 chuẩn UI/UX, responsive, xử lý state loading/error/empty.
  - `antigravity_sync_api_contract`: Đối soát contract API giữa Express backend và TanStack Query frontend.
  - `antigravity_generate_tests`: Sinh unit/integration test độc lập kèm mock fixture an toàn.
  - `antigravity_diagnose_error`: Mổ xẻ nguyên nhân gốc rễ (RCA) khi gặp crash hoặc lỗi build/test.

---

## 3. Quy trình Phối hợp Chuẩn (Collaboration Workflow)

1. **Khảo sát & Lập kế hoạch:**
   - Trước khi thực hiện tính năng mới hoặc tái cấu trúc, Codex đọc các file liên quan và gọi `antigravity_plan(task_description, context)` để nhận kế hoạch chi tiết.
2. **Triển khai mã nguồn:**
   - Với Backend: Codex viết mã nguồn theo kế hoạch.
   - Với Frontend: Codex có thể cung cấp spec API cho `antigravity_create_frontend` để nhận mã component chuẩn.
3. **Review & Kiểm thử chéo:**
   - Codex gọi `antigravity_review_backend` hoặc `antigravity_code_review` để Antigravity kiểm tra lỗ hổng và rủi ro.
   - Codex gọi `antigravity_generate_tests` để nhận kịch bản test, sau đó tự chạy test cục bộ qua `npm test`.
