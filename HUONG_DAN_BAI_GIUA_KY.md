# Hướng dẫn chi tiết bài kiểm tra giữa kỳ môn Web — SouvenirShop

**Đối tượng cá nhân:** Product — Sản phẩm

**Công nghệ:** NestJS 11, TypeScript, Sequelize, PostgreSQL; frontend React/Vite

**Repository:** [MinhDq113jqk/thietkewednangcao](https://github.com/MinhDq113jqk/thietkewednangcao)

**Ngày tổng hợp hướng dẫn:** 07/10/2026

Tài liệu gom toàn bộ hướng dẫn thực hiện bài giữa kỳ: phần CSDL nhóm, CRUD cá nhân, Activity Diagram, README, Git và văn bản nộp bài.

> Hướng dẫn được đối chiếu với mã nguồn trong checkout local. Các lệnh, ảnh cần chụp và kết quả mong đợi dưới đây là các bước sinh viên thực hiện, không phải xác nhận đã hoàn thành bài nộp. Phần chuyển backend sang NestJS hiện còn thay đổi chưa commit; người phụ trách cần đưa nền và code liên quan lên repo trước khi dùng một bản clone mới để chạy các lệnh trong tài liệu. Commit riêng tài liệu này không đồng nghĩa code, sơ đồ và minh chứng CRUD đã được đưa lên GitHub.

## Mục lục

1. [Yêu cầu, thang điểm và đối tượng cá nhân](#phan-1)
2. [Phần nhóm: xây dựng và chạy CSDL](#phan-2)
3. [Kết nối CSDL và chạy ứng dụng NestJS](#phan-3)
4. [Hiểu cấu trúc triển khai CRUD Product](#phan-4)
5. [Thực hiện và thu thập minh chứng CRUD](#phan-5)
6. [Vẽ Activity Diagram cho CRUD](#phan-6)
7. [Cập nhật README, commit và push GitHub](#phan-7)
8. [Làm văn bản báo cáo nộp bài](#phan-8)
9. [Checklist, trình tự demo và quy định làm bài](#phan-9)
10. [Tài liệu tham khảo](#tham-khao)

<a id="phan-1"></a>

## 1. Yêu cầu, thang điểm và đối tượng cá nhân

### 1.1. Đối chiếu đề bài

| Phần | Điểm | Yêu cầu | Thực hiện trên SouvenirShop |
|---|---:|---|---|
| Nhóm | 3 điểm chung | Xây dựng file SQL và chạy lên hệ quản trị CSDL | Schema PostgreSQL của SouvenirShop; chạy SQL và lưu minh chứng |
| Cá nhân | 1 | Create | Tạo Product |
| Cá nhân | 1 | Read | Đọc danh sách và chi tiết Product |
| Cá nhân | 1 | Update | Cập nhật Product |
| Cá nhân | 1 | Delete | Xóa Product; giải thích thêm cơ chế ẩn |
| Cá nhân | 2 | Activity Diagram CRUD | Vẽ bốn sơ đồ tương ứng |
| Cá nhân | 1 | README và commit | Ghi phần phụ trách, API, cách chạy, minh chứng; commit lên repo |

Đề nêu 3 điểm cho phần nhóm, không chia cụ thể điểm cho từng ý SQL. Phần cá nhân tổng cộng 7 điểm.

Văn bản nộp cần có:

1. Link GitHub phần công việc của sinh viên.
2. Code chính của các yêu cầu.
3. Lưu đồ thuật toán/Activity Diagram.

Một sản phẩm chạy được vẫn cần README, commit, sơ đồ và minh chứng để tạo thành bộ bài nộp.

### 1.2. Chốt đối tượng cá nhân

Theo README local:

- Sinh viên: Dương Quang Minh.
- MSSV: 23010567.
- GitHub: MinhDq113jqk.
- Đề tài: SouvenirShop — Marketplace quà lưu niệm Việt Nam.
- Đối tượng phụ trách: **Product — Sản phẩm**.

Product đã được phân tích trong tài liệu yêu cầu của dự án. Các chức năng liên quan gồm tạo, cập nhật, quản lý tồn kho/trạng thái, xóa hoặc ẩn sản phẩm; người mua đọc danh sách và chi tiết.

Nếu nhóm có thêm thành viên, bổ sung danh sách người thật và đối tượng thực tế đã phân tích. Không để hai người cùng chọn một đối tượng.

Ví dụ phân công chỉ dùng khi đúng với nhóm:

| Thành viên | Đối tượng |
|---|---|
| Bạn | Product |
| Thành viên khác | Shop |
| Thành viên khác | Order |

Không đổi hoặc thêm đối tượng chỉ để chia đều nếu đối tượng đó chưa có trong phân tích của nhóm.

### 1.3. Chuẩn bị môi trường

Các lệnh trong hướng dẫn chạy từ:

~~~powershell
cd C:\Users\LEGION\myproject
~~~

Cần có:

- Node.js và npm; README hiện hướng dẫn Node.js 24.
- PostgreSQL đang hoạt động.
- PowerShell 7 cho các lệnh có -StatusCodeVariable và -SkipHttpErrorCheck.
- pgAdmin hoặc psql để kiểm chứng dữ liệu.
- Git đã cấu hình và có quyền push repository.

Kiểm tra phiên bản:

~~~powershell
node --version
npm.cmd --version
$PSVersionTable.PSVersion
git --version
~~~

Các khối PowerShell dùng dấu backtick cuối dòng để xuống dòng lệnh; không thêm khoảng trắng sau dấu này.

<a id="phan-2"></a>

## 2. Phần nhóm: xây dựng và chạy CSDL

### 2.1. Xác định file SQL

Project sử dụng hai đường dẫn:

~~~text
source/backend/database.sql   # SQL chuẩn của backend
database.sql                  # Bản sao ở thư mục gốc phục vụ nộp bài
~~~

File trong backend là nguồn chuẩn; file ở gốc được đồng bộ từ nguồn đó.

Cài thư viện nếu chưa có:

~~~powershell
npm.cmd --prefix source ci
npm.cmd --prefix source/backend ci
~~~

Đồng bộ và kiểm tra hai file:

~~~powershell
npm.cmd --prefix source/backend run db:sync-sql
npm.cmd --prefix source/backend run db:sync-sql -- --check
~~~

**Tiêu chí hoàn thành:** SQL nộp bài thống nhất với SQL backend đang dùng.

### 2.2. Hiểu và trình bày thiết kế CSDL

Schema hiện có 13 bảng:

| Bảng | Chức năng |
|---|---|
| users | Tài khoản người dùng |
| shops | Gian hàng |
| regions | Vùng văn hóa |
| craft_villages | Làng nghề |
| products | Sản phẩm |
| orders | Đơn hàng |
| order_items | Chi tiết đơn hàng |
| addresses | Địa chỉ |
| reviews | Đánh giá |
| checkout_attempts | Theo dõi lần tạo đơn, chống lặp |
| payment_transactions | Giao dịch thanh toán |
| conversations | Cuộc hội thoại |
| chat_messages | Tin nhắn |

Các quan hệ liên quan Product:

- Người dùng sở hữu gian hàng qua shops.ownerId.
- Một gian hàng có nhiều sản phẩm qua products.shopId.
- Sản phẩm có thể gắn làng nghề qua products.craftVillageId.
- Chi tiết đơn hàng tham chiếu sản phẩm.
- Đánh giá tham chiếu sản phẩm.

Những trường cần nắm:

| Trường | Ý nghĩa |
|---|---|
| id | Khóa chính UUID |
| shopId | Gian hàng sở hữu sản phẩm |
| craftVillageId | Làng nghề, có thể để trống |
| name | Tên sản phẩm |
| description | Mô tả |
| price | Giá bán |
| salePrice | Giá khuyến mãi |
| stock | Tồn kho |
| images | Danh sách ảnh |
| category | Danh mục |
| dataSource | Nguồn dữ liệu: seller/demo/legacy |
| isActive | Đang hiển thị hay đã ẩn |
| isFlashSale | Cờ khuyến mãi |
| sold | Số lượng đã bán |
| createdAt, updatedAt | Thời gian tạo/cập nhật |

Trong báo cáo nhóm, trình bày cả bảng, khóa chính, khóa ngoại và ý nghĩa quan hệ. Chỉ chụp danh sách bảng chưa thể hiện đầy đủ phần thiết kế.

PostgreSQL cần dấu ngoặc kép cho tên cột có chữ hoa, ví dụ "shopId", "isActive". Khóa ngoại của Product được khai báo ở các khối bổ sung ràng buộc trong file SQL; cần đọc cả phần đó.

### 2.3. Tạo database cho bài giữa kỳ

Có thể dùng database đang chạy nếu đã biết rõ cấu hình. Để thực hành riêng, hướng dẫn dùng database mới tên souvenirshop_midterm.

Với PostgreSQL 18 cài ở đường dẫn mặc định:

~~~powershell
$taskPsql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'

& $taskPsql `
  -h 127.0.0.1 `
  -U postgres `
  -d postgres `
  -c "CREATE DATABASE souvenirshop_midterm;"
~~~

Nhập mật khẩu PostgreSQL khi được hỏi. Nếu cài phiên bản khác, sửa đường dẫn psql.exe cho đúng.

Nếu database đã tồn tại, bỏ qua bước tạo. Không xóa database đang có để chạy lại bài hướng dẫn.

Có thể tạo bằng pgAdmin thay thế: chọn máy chủ PostgreSQL, tạo database souvenirshop_midterm.

### 2.4. Chạy trực tiếp file SQL

Bước này chứng minh rõ yêu cầu chạy file SQL lên hệ quản trị CSDL:

~~~powershell
& $taskPsql `
  -h 127.0.0.1 `
  -U postgres `
  -d souvenirshop_midterm `
  --single-transaction `
  -v ON_ERROR_STOP=1 `
  -f .\source\backend\database.sql

$LASTEXITCODE
~~~

**Kết quả mong đợi:** không có lỗi SQL, mã thoát bằng 0.

Nếu dùng pgAdmin: chọn đúng database, mở Query Tool, mở file SQL, thực thi và chụp kết quả. Chọn một cách làm chính và ghi rõ trong báo cáo.

### 2.5. Kiểm chứng CSDL

Chạy các truy vấn sau trong Query Tool của database souvenirshop_midterm.

**A. Tên database và danh sách bảng:**

~~~sql
SELECT current_database();

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
~~~

Trên database mới, phải có 13 bảng của project.

**B. Cấu trúc Product:**

~~~sql
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products'
ORDER BY ordinal_position;
~~~

**C. Ràng buộc Product:**

~~~sql
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.products'::regclass
ORDER BY conname;
~~~

### 2.6. Minh chứng phần nhóm

Lưu:

1. File SQL.
2. Kết quả thực thi SQL thành công.
3. Tên database và danh sách bảng.
4. Cấu trúc bảng products.
5. Khóa chính, khóa ngoại liên quan.

**Hoàn thành khi:** database được tạo từ SQL và có ảnh chứng minh kết quả.

<a id="phan-3"></a>

## 3. Kết nối CSDL và chạy ứng dụng NestJS

### 3.1. Tạo cấu hình local

~~~powershell
npm.cmd --prefix source/backend run env:local
~~~

Lệnh tạo source/backend/.env nếu chưa có, sinh cấu hình bí mật local; giữ nguyên file đã tồn tại.

Mở .env trên máy và sửa DATABASE_URL theo database vừa tạo:

~~~dotenv
DATABASE_URL=postgresql://postgres:<MAT_KHAU_DA_URL_ENCODE>@127.0.0.1:5432/souvenirshop_midterm
~~~

Thay phần trong dấu <...> bằng mật khẩu PostgreSQL của bạn. URL-encode mật khẩu nếu có ký tự đặc biệt.

Không đưa .env, mật khẩu, JWT secrets, access token hoặc refresh token vào GitHub/báo cáo.

Nếu backend đang chạy khi đổi .env, khởi động lại backend để dùng cấu hình mới. Query Tool và backend phải trỏ cùng database.

### 3.2. Migration và kiểm tra kết nối

~~~powershell
npm.cmd --prefix source/backend run migrate
npm.cmd --prefix source/backend run db:check
~~~

SQL đã được nhập ở phần 2; migration chuẩn bị schema theo cơ chế backend. Không cần tạo lại database.

| Lỗi | Kiểm tra |
|---|---|
| Sai mật khẩu | Tài khoản PostgreSQL và DATABASE_URL |
| Không kết nối | PostgreSQL đã chạy, đúng host/port |
| Database không tồn tại | Tên database trong URL |
| Thiếu bảng | SQL đã chạy vào đúng database |
| API và pgAdmin thấy dữ liệu khác nhau | Hai công cụ có dùng cùng database |

### 3.3. Seed dữ liệu demo

~~~powershell
npm.cmd --prefix source/backend run seed:demo
~~~

Trên database mới, seed tạo tài khoản người bán seller-test@example.com và gian hàng gom-bat-trang-test ở trạng thái active.

Mật khẩu cho tài khoản mới lấy từ SEED_ACCOUNT_PASSWORD trong .env. Nếu biến không được đặt, seed sinh mật khẩu và thông báo cho tài khoản mới tạo. Không chụp hoặc đưa thông báo có mật khẩu vào tài liệu.

Seed giữ nguyên tài khoản/gian hàng đã tồn tại:

- Sửa SEED_ACCOUNT_PASSWORD rồi seed lại không đổi mật khẩu tài khoản cũ.
- Seed không tự đổi vai trò hoặc kích hoạt tài khoản cũ.
- Seed không tự đưa gian hàng cũ về active.

Không gọi dữ liệu seed là dữ liệu người dùng thực. Bạn sẽ tạo một Product minh chứng riêng ở phần 5.

### 3.4. Chạy hai ứng dụng

**Terminal 1 — backend:**

~~~powershell
cd C:\Users\LEGION\myproject
npm.cmd --prefix source/backend run dev
~~~

**Terminal 2 — frontend:**

~~~powershell
cd C:\Users\LEGION\myproject
npm.cmd --prefix source run dev
~~~

Địa chỉ:

- API: http://localhost:3000
- Giao diện: http://127.0.0.1:5173

Mở terminal thứ ba để chạy các lệnh API:

~~~powershell
cd C:\Users\LEGION\myproject
Invoke-RestMethod http://localhost:3000/health
~~~

Kết quả mong đợi:

~~~json
{
  "status": "ok",
  "database": "connected",
  "schema": "ready",
  "tables": 13
}
~~~

Health chứng minh kết nối/schema; cần thực hiện CRUD thật để hoàn thành phần cá nhân. Nếu port đang được ứng dụng khác sử dụng, xác định ứng dụng đó trước khi dừng hoặc đổi port.

<a id="phan-4"></a>

## 4. Hiểu cấu trúc triển khai CRUD Product

### 4.1. Thành phần và đường dẫn

| Thành phần | Đường dẫn từ gốc repo | Vai trò |
|---|---|---|
| Entity/model | source/backend/src/modules/products/product.entity.js | Ánh xạ bảng products |
| Controller người bán | source/backend/src/modules/products/seller-products.controller.ts | API CRUD quản lý |
| Controller công khai | source/backend/src/modules/products/products.controller.ts | API đọc catalog/chi tiết |
| Service | source/backend/src/modules/products/products.service.ts | Nghiệp vụ và truy vấn |
| Module | source/backend/src/modules/products/products.module.ts | Đăng ký controller/provider |
| Provider | source/backend/src/modules/products/products.providers.ts | Cung cấp model cho service |
| Create DTO | source/backend/src/modules/products/dto/create-product.dto.ts | Mô tả dữ liệu tạo |
| Update DTO | source/backend/src/modules/products/dto/update-product.dto.ts | Mô tả dữ liệu cập nhật |
| Pipe | source/backend/src/modules/products/pipes/product-input.pipe.ts | Kiểm tra cấu trúc body |
| Validation | source/backend/src/services/productValidation.service.js | Kiểm tra trường dữ liệu |

Các thành phần nền:

~~~text
source/backend/src/app.module.ts
source/backend/src/database/database.module.ts
source/backend/src/common/guards/auth.guard.ts
source/backend/src/common/guards/roles.guard.ts
source/backend/src/common/decorators/roles.decorator.ts
~~~

Backend chính dùng NestJS và Sequelize. Product là Sequelize model, không phải TypeORM Entity. Controller/service/module/guard dùng TypeScript; model và một số helper dùng JavaScript được biên dịch với allowJs.

### 4.2. Luồng xử lý cần giải thích

~~~text
Người dùng gửi request
→ Guard xác thực và kiểm tra vai trò
→ Pipe kiểm tra đầu vào
→ Controller gọi Service
→ Service kiểm tra gian hàng, quyền sở hữu và nghiệp vụ
→ Sequelize truy vấn PostgreSQL
→ API trả kết quả
~~~

Không phải route nào cũng có body pipe; Read và Delete không có body sản phẩm.

### 4.3. Entity/model

Các điểm cần trình bày:

- Product extends Model.
- Product.init(...) khai báo thuộc tính.
- tableName: 'products' xác định bảng.
- id là UUID và khóa chính.
- shopId liên kết gian hàng.
- timestamps: true quản lý thời gian tạo/cập nhật.

Trích code model thật khi làm báo cáo, không viết model TypeORM khác với project.

### 4.4. Controller

Ví dụ trích từ controller hiện tại:

~~~typescript
@Post()
create(
  @Req() request: AppRequest,
  @Body(ProductInputPipe) body: CreateProductDto,
) {
  return this.service.createSellerProduct(request.user.id, body);
}
~~~

Giải thích:

- @Post() xử lý request tạo.
- @Req() lấy người dùng đã được xác thực.
- @Body(ProductInputPipe) lấy body và kiểm tra cấu trúc.
- Service nhận ID người đăng nhập, không nhận shopId tùy ý từ client.

Controller quản lý có AuthGuard, RolesGuard và @Roles('seller', 'admin').

### 4.5. Service

| Hàm | Thao tác |
|---|---|
| createSellerProduct() | Tạo |
| listSellerProducts() | Đọc danh sách của shop |
| updateSellerProduct() | Cập nhật |
| deleteSellerProduct() | Ẩn |
| restoreSellerProduct() | Khôi phục |
| permanentDeleteSellerProduct() | Xóa vĩnh viễn |

Service tìm shop theo ownerId của người đăng nhập và tìm sản phẩm theo cả id, shopId. Tài khoản admin không tự có quyền sửa sản phẩm của mọi gian hàng qua các API này.

Tạo và khôi phục yêu cầu shop active. Update và Delete hiện không có điều kiện bắt buộc shop active; sơ đồ phải phản ánh đúng code.

### 4.6. Module và Provider

Module hiện tại:

~~~typescript
@Module({
  controllers: [ProductsController, SellerProductsController],
  providers: [ProductsService, ...productProviders],
})
export class ProductsModule {}
~~~

Ví dụ provider:

~~~typescript
{
  provide: PRODUCT_REPOSITORY,
  useFactory: (models: any) => models.Product,
  inject: [DATABASE_MODELS],
}
~~~

Service nhận model bằng:

~~~typescript
@Inject(PRODUCT_REPOSITORY) private readonly products: any
~~~

NestJS cung cấp model Product cho service qua dependency injection. ProductsModule đã được khai báo trong AppModule local.

### 4.7. DTO, pipe và validation

DTO mô tả kiểu dữ liệu. Kiểm tra thực tế nằm ở pipe và validator dùng chung.

| Trường | Quy tắc chính |
|---|---|
| name | Bắt buộc khi tạo; tối đa 200 ký tự |
| price | Số nguyên dương; tối đa 999999999999999 |
| stock | Số nguyên không âm; tối đa 1000000000 |
| category | Danh mục được hỗ trợ, ví dụ Gốm sứ |
| salePrice | Nếu có, phải hợp lệ, dương và không vượt price |
| description | Tối đa 5000 ký tự |
| images | Tối đa 8 chuỗi, mỗi chuỗi tối đa 2000 ký tự |
| isActive, isFlashSale | Đúng kiểu boolean nếu được gửi |

Update kiểm tra theo dữ liệu hiện tại và cho phép gửi một phần các trường. Backend quyết định shopId/dataSource. Validation hiện kiểm tra danh sách chuỗi ảnh và độ dài; không nên mô tả thành kiểm chứng ảnh từ xa đã tồn tại.

<a id="phan-5"></a>

## 5. Thực hiện và thu thập minh chứng CRUD

### 5.1. Quy tắc thực hành

- Dùng một Product mới tạo cho toàn bộ Create → Read → Update → Delete.
- Giữ cùng UUID để đối chiếu.
- Dùng đúng database đã cấu hình ở phần 3.
- Không dùng sản phẩm đang có lịch sử đơn hàng để thử xóa vĩnh viễn.
- Các biến PowerShell bên dưới phải chạy trong cùng terminal API.
- Kết quả bên dưới là mong đợi; lưu kết quả thực tế vào bài nộp.

### 5.2. Bảng API

| Thao tác | Method | Endpoint | Thành công |
|---|---|---|---|
| Create | POST | /api/seller/products | 201 |
| Read của seller | GET | /api/seller/products | 200, mảng |
| Read công khai | GET | /api/products | 200, object phân trang |
| Chi tiết công khai | GET | /api/products/:id | 200 |
| Update | PUT | /api/seller/products/:id | 200 |
| Ẩn | DELETE | /api/seller/products/:id | 200 |
| Khôi phục | PUT | /api/seller/products/:id/restore | 200 |
| Xóa vĩnh viễn | DELETE | /api/seller/products/:id/permanent | 200; từ chối lịch sử với 409 |

### 5.3. Đăng nhập người bán

~~~powershell
$taskApi = 'http://localhost:3000'
$taskPassword = Read-Host 'Mật khẩu tài khoản người bán' -AsSecureString

$taskLoginBody = @{
    email = 'seller-test@example.com'
    password = [System.Net.NetworkCredential]::new('', $taskPassword).Password
} | ConvertTo-Json

$taskSellerLogin = Invoke-RestMethod `
    -Method Post `
    -Uri "$taskApi/api/auth/login" `
    -ContentType 'application/json; charset=utf-8' `
    -Body $taskLoginBody

$taskHeaders = @{
    Authorization = "Bearer $($taskSellerLogin.token)"
}
~~~

Không in taskSellerLogin hoặc taskHeaders khi chụp ảnh vì chứa token. Khi token hết hạn, chạy lại đăng nhập để cập nhật taskHeaders; không cần tạo lại sản phẩm.

Kiểm tra gian hàng:

~~~powershell
$taskShop = Invoke-RestMethod `
    -Method Get `
    -Uri "$taskApi/api/shops/me" `
    -Headers $taskHeaders

$taskShop | Select-Object id, name, status
~~~

Điều kiện Create: gian hàng tồn tại và status bằng active.

Nếu đăng nhập lỗi, kiểm tra tài khoản thuộc database đang dùng và mật khẩu đã biết trên máy. Rerun seed không đặt lại mật khẩu cũ.

### 5.4. Create — tạo sản phẩm

**API:** POST /api/seller/products

~~~powershell
$taskCreateBody = @{
    name = 'Cốc gốm minh chứng giữa kỳ'
    category = 'Gốm sứ'
    price = 120000
    stock = 10
    description = 'Dữ liệu minh chứng CRUD Product'
    images = @()
} | ConvertTo-Json -Depth 5

$taskCreated = Invoke-RestMethod `
    -Method Post `
    -Uri "$taskApi/api/seller/products" `
    -Headers $taskHeaders `
    -ContentType 'application/json; charset=utf-8' `
    -Body $taskCreateBody `
    -StatusCodeVariable taskCreateStatus

$taskProductId = $taskCreated.id

$taskCreateStatus
$taskCreateBody
$taskCreated | Select-Object id, name, category, price, stock, isActive
~~~

Kết quả cần có:

- HTTP 201.
- UUID mới.
- Tên đúng.
- Giá 120000, tồn kho 10.
- isActive bằng true.

Trong pgAdmin, thay <UUID_SAN_PHAM_VUA_TAO> bằng taskProductId, không giữ nguyên placeholder:

~~~sql
SELECT
    id,
    name,
    category,
    price,
    stock,
    "isActive",
    "shopId"
FROM products
WHERE id = '<UUID_SAN_PHAM_VUA_TAO>';
~~~

**Minh chứng:** request body, status/response và bản ghi PostgreSQL có cùng UUID.

### 5.5. Read — đọc sản phẩm

**A. Đọc danh sách seller:**

~~~powershell
$taskSellerProducts = Invoke-RestMethod `
    -Method Get `
    -Uri "$taskApi/api/seller/products" `
    -Headers $taskHeaders `
    -StatusCodeVariable taskReadStatus

$taskReadStatus

$taskSellerProducts |
    Where-Object { $_.id -eq $taskProductId } |
    Select-Object id, name, price, stock, isActive
~~~

API seller trả mảng, không dùng thuộc tính items.

**B. Đọc chi tiết công khai:**

~~~powershell
$taskDetail = Invoke-RestMethod `
    -Method Get `
    -Uri "$taskApi/api/products/$taskProductId" `
    -StatusCodeVariable taskDetailStatus

$taskDetailStatus
$taskDetail | Select-Object id, name, category, price, stock
~~~

Kết quả cần có:

- HTTP 200.
- Đúng UUID.
- Dữ liệu khớp PostgreSQL.

API công khai chỉ trả sản phẩm đang hoạt động thuộc shop active. Danh sách seller có thể chứa sản phẩm đã ẩn. Gian hàng có danh sách rỗng vẫn trả 200.

**Minh chứng:** danh sách có sản phẩm và/hoặc response chi tiết; có cả hai nếu thuận tiện.

### 5.6. Update — cập nhật sản phẩm

**API:** PUT /api/seller/products/:id

~~~powershell
$taskUpdateBody = @{
    name = 'Cốc gốm minh chứng giữa kỳ - đã cập nhật'
    price = 150000
    stock = 15
} | ConvertTo-Json

$taskUpdated = Invoke-RestMethod `
    -Method Put `
    -Uri "$taskApi/api/seller/products/$taskProductId" `
    -Headers $taskHeaders `
    -ContentType 'application/json; charset=utf-8' `
    -Body $taskUpdateBody `
    -StatusCodeVariable taskUpdateStatus

$taskUpdateStatus
$taskUpdateBody
$taskUpdated | Select-Object id, name, price, stock
~~~

Chạy lại truy vấn SQL của Create và đối chiếu:

| Thuộc tính | Trước | Sau |
|---|---|---|
| ID | UUID đã tạo | Giữ nguyên |
| Tên | Cốc gốm minh chứng giữa kỳ | Cốc gốm minh chứng giữa kỳ - đã cập nhật |
| Giá | 120000 | 150000 |
| Tồn kho | 10 | 15 |

**Minh chứng:** HTTP 200, response mới và bản ghi DB đã cập nhật.

### 5.7. Kiểm tra dữ liệu không hợp lệ

Thực hiện trước Delete để giữ thứ tự bộ minh chứng:

~~~powershell
$taskInvalidBody = @{
    name = 'Sản phẩm thử dữ liệu lỗi'
    category = 'Gốm sứ'
    price = -100
    stock = 10
} | ConvertTo-Json

$taskInvalidResponse = Invoke-RestMethod `
    -Method Post `
    -Uri "$taskApi/api/seller/products" `
    -Headers $taskHeaders `
    -ContentType 'application/json; charset=utf-8' `
    -Body $taskInvalidBody `
    -SkipHttpErrorCheck `
    -StatusCodeVariable taskInvalidStatus

$taskInvalidStatus
$taskInvalidResponse | ConvertTo-Json -Depth 6
~~~

Mong đợi HTTP 400, không tạo bản ghi.

| Mã | Ý nghĩa trong các luồng này |
|---|---|
| 400 | Dữ liệu hoặc UUID không hợp lệ |
| 401 | Chưa đăng nhập/token không hợp lệ/tài khoản không hợp lệ |
| 403 | Vai trò không được phép; hoặc Create khi shop chưa active |
| 404 | Không có shop/sản phẩm trong phạm vi truy cập |
| 409 | Xóa vĩnh viễn sản phẩm có lịch sử đơn hàng/đánh giá |

Sửa/xóa sản phẩm ngoài shop được truy vấn theo id và shopId nên không tìm thấy trong phạm vi và trả 404. Không ghi nhầm tất cả trường hợp này thành 403.

### 5.8. Delete — ẩn và xóa vĩnh viễn

| Cơ chế | API | Tác động |
|---|---|---|
| Ẩn | DELETE /api/seller/products/:id | Giữ bản ghi, đặt isActive=false |
| Xóa vĩnh viễn | DELETE /api/seller/products/:id/permanent | Xóa bản ghi nếu không có lịch sử liên quan |

Để chứng minh rõ Delete, thực hiện cả hai trên Product minh chứng vừa tạo.

**A. Ẩn:**

~~~powershell
$taskHidden = Invoke-RestMethod `
    -Method Delete `
    -Uri "$taskApi/api/seller/products/$taskProductId" `
    -Headers $taskHeaders `
    -StatusCodeVariable taskHideStatus

$taskHideStatus
$taskHidden
~~~

Mong đợi HTTP 200, thông báo đã ẩn.

Kiểm tra:

~~~sql
SELECT id, name, "isActive"
FROM products
WHERE id = '<UUID_SAN_PHAM_VUA_TAO>';
~~~

Bản ghi còn, isActive=false.

Kiểm tra API chi tiết công khai:

~~~powershell
$taskHiddenDetail = Invoke-RestMethod `
    -Method Get `
    -Uri "$taskApi/api/products/$taskProductId" `
    -SkipHttpErrorCheck `
    -StatusCodeVariable taskHiddenDetailStatus

$taskHiddenDetailStatus
$taskHiddenDetail
~~~

Mong đợi HTTP 404. Danh sách seller vẫn có sản phẩm ẩn.

**B. Xóa vĩnh viễn:**

Chỉ dùng UUID vừa tạo cho bài thực hành:

~~~powershell
$taskDeleted = Invoke-RestMethod `
    -Method Delete `
    -Uri "$taskApi/api/seller/products/$taskProductId/permanent" `
    -Headers $taskHeaders `
    -StatusCodeVariable taskDeleteStatus

$taskDeleteStatus
$taskDeleted
~~~

Mong đợi HTTP 200, thông báo đã xóa vĩnh viễn.

~~~sql
SELECT COUNT(*) AS remaining_rows
FROM products
WHERE id = '<UUID_SAN_PHAM_VUA_TAO>';
~~~

Kết quả cần có: remaining_rows = 0.

Nếu trả 409, sản phẩm có lịch sử đơn hàng/đánh giá. Không xóa lịch sử để vượt qua kiểm tra; dùng một Product mới, chưa có dữ liệu liên quan.

Khôi phục là chức năng bổ sung: PUT /api/seller/products/:id/restore. Không cần khôi phục trước khi xóa vĩnh viễn; sau xóa vĩnh viễn không còn bản ghi để khôi phục.

### 5.9. Nếu sử dụng Postman

Có thể dùng Postman thay PowerShell với cùng API/body:

1. Gửi POST /api/auth/login với email và password.
2. Lấy access token từ response.
3. Request CRUD: Authorization → Bearer Token.
4. Create/Update: chọn Body JSON.
5. Gửi request.
6. Chụp method, URL, body, HTTP status và response.
7. Đối chiếu dữ liệu PostgreSQL.

Che mật khẩu/token trên ảnh. Chỉ cần một công cụ làm bộ minh chứng chính.

### 5.10. Tóm tắt tiêu chí CRUD

| Thao tác | API | Bằng chứng DB |
|---|---|---|
| Create | 201, UUID mới | Có 1 bản ghi đúng UUID |
| Read | 200, dữ liệu đúng | Khớp bản ghi đã tạo |
| Update | 200, UUID giữ nguyên | Giá/tồn kho/tên đã đổi |
| Ẩn | 200; public detail 404 | Bản ghi còn, isActive=false |
| Xóa vĩnh viễn | 200 | COUNT theo UUID bằng 0 |

<a id="phan-6"></a>

## 6. Vẽ Activity Diagram cho CRUD

### 6.1. Chuẩn bị bốn sơ đồ

Tên đề xuất:

1. AD_Product_Create.
2. AD_Product_Read.
3. AD_Product_Update.
4. AD_Product_Delete.

Có thể thêm AD_Product_Hide để giải thích cơ chế ẩn.

| Ký hiệu | Ý nghĩa |
|---|---|
| Chấm tròn đặc | Bắt đầu |
| Chữ nhật bo góc | Hành động |
| Hình thoi | Điều kiện/rẽ nhánh |
| Mũi tên | Luồng điều khiển |
| Vòng tròn bao chấm đặc | Kết thúc activity |
| Swimlane | Phân chia trách nhiệm |

Dùng ba swimlane khi phù hợp: Người bán, Hệ thống NestJS, CSDL PostgreSQL.

Công cụ theo đề: [Visual Paradigm Online](https://online.visual-paradigm.com/). Có thể vẽ tay và chụp ảnh theo yêu cầu giảng viên. Giữ file nguồn và ảnh xuất để chỉnh sửa.

Các khối dưới đây là đặc tả luồng để chuyển thành sơ đồ UML, không thay thế ảnh Activity Diagram cần nộp.

### 6.2. Create

~~~text
Bắt đầu
→ Người bán nhập thông tin
→ Gửi POST /api/seller/products
→ Xác thực tài khoản
→ Kiểm tra vai trò seller/admin
→ Kiểm tra cấu trúc body
→ Tìm gian hàng theo người đăng nhập
→ Kiểm tra shop active
→ Kiểm tra các trường sản phẩm
→ Xác định shopId từ gian hàng
→ Lưu Product vào PostgreSQL
→ Xóa cache danh sách
→ Trả 201 và dữ liệu
→ Người bán nhận kết quả
→ Kết thúc
~~~

Các decision và nhánh lỗi:

| Điều kiện | Nếu không |
|---|---|
| Xác thực hợp lệ? | Trả 401 → Kết thúc |
| Vai trò được phép? | Trả 403 → Kết thúc |
| Body đúng cấu trúc? | Trả 400 → Kết thúc |
| Có gian hàng? | Trả 404 → Kết thúc |
| Gian hàng active? | Trả 403 → Kết thúc |
| Trường dữ liệu hợp lệ? | Trả 400 → Kết thúc |

Gắn nhãn [Có]/[Không] lên mũi tên rẽ nhánh.

### 6.3. Read

Sơ đồ chính dùng API đọc danh sách seller:

~~~text
Bắt đầu
→ Người bán yêu cầu xem sản phẩm
→ Gửi GET /api/seller/products
→ Xác thực tài khoản
→ Kiểm tra vai trò
→ Tìm gian hàng theo người đăng nhập
→ Truy vấn Product theo shopId
→ Thống kê số order_items/reviews liên quan
→ Chuẩn hóa dữ liệu
→ Trả 200 và danh sách
→ Người bán xem kết quả
→ Kết thúc
~~~

Nhánh lỗi: xác thực không hợp lệ → 401; sai vai trò → 403; không có shop → 404.

Danh sách rỗng vẫn trả 200.

Nếu thêm Read chi tiết công khai:

~~~text
Nhận ID
→ Tìm Product isActive=true thuộc shop active
→ Tìm thấy?
   Có → Trả 200 và chi tiết
   Không → Trả 404
→ Kết thúc
~~~

### 6.4. Update

~~~text
Bắt đầu
→ Người bán chọn Product và nhập thay đổi
→ Gửi PUT /api/seller/products/:id
→ Xác thực tài khoản
→ Kiểm tra vai trò
→ Kiểm tra UUID và cấu trúc body
→ Tìm shop của người đăng nhập
→ Tìm Product theo id và shopId
→ Kiểm tra dữ liệu cập nhật cùng dữ liệu hiện tại
→ Cập nhật PostgreSQL
→ Xóa cache danh sách
→ Trả 200 và Product đã cập nhật
→ Người bán nhận kết quả
→ Kết thúc
~~~

Nhánh lỗi:

- Xác thực thất bại → 401.
- Sai vai trò → 403.
- UUID/body sai → 400.
- Không có shop → 404.
- Không tìm thấy Product thuộc shop → 404.
- Trường dữ liệu không hợp lệ → 400.

Không thêm điều kiện shop active vào Update: code hiện tại không bắt buộc điều kiện này.

### 6.5. Delete vĩnh viễn

~~~text
Bắt đầu
→ Người bán chọn xóa vĩnh viễn Product
→ Gửi DELETE /api/seller/products/:id/permanent
→ Xác thực tài khoản
→ Kiểm tra vai trò
→ Kiểm tra UUID
→ Tìm shop của người đăng nhập
→ Tìm Product theo id và shopId
→ Đếm order_items và reviews liên quan
→ Có lịch sử liên quan?
   Có → Trả 409 → Người bán nhận thông báo → Kết thúc
   Không → Xóa bản ghi PostgreSQL
→ Xóa cache danh sách
→ Trả 200
→ Người bán nhận kết quả
→ Kết thúc
~~~

Bổ sung các nhánh 401, 403, 400, 404 tương ứng.

### 6.6. Ẩn, nếu vẽ thêm

Luồng tương tự đến bước tìm Product, sau đó:

~~~text
Cập nhật isActive=false
→ Xóa cache danh sách
→ Trả 200
→ Người bán nhận kết quả
→ Kết thúc
~~~

Không vẽ hành động xóa bản ghi cho API ẩn.

### 6.7. Kiểm tra chất lượng sơ đồ

- Có initial node và activity final.
- Hành động bắt đầu bằng động từ: Kiểm tra, Tìm, Lưu, Cập nhật, Trả.
- Decision có nhãn nhánh.
- Mọi nhánh dẫn đến hành động tiếp hoặc kết thúc.
- Có luồng thành công và lỗi.
- Khớp code/API thật.
- Chữ đọc được khi chèn vào báo cáo.
- Giữ file nguồn; xuất PNG/SVG/PDF theo định dạng nộp.

<a id="phan-7"></a>

## 7. Cập nhật README, commit và push GitHub

### 7.1. Nội dung README

README local đã có cấu trúc project và API Product. Bổ sung mục giữa kỳ với mẫu sau. Các đường dẫn là tương đối từ README ở gốc repo; chỉ giữ link minh chứng sau khi file thật đã có.

~~~~markdown
## Bài kiểm tra giữa kỳ — CRUD Product

### Thông tin sinh viên

- Họ tên: Dương Quang Minh
- MSSV: 23010567
- Đối tượng phụ trách: Product
- Công nghệ: NestJS, Sequelize, PostgreSQL

### Cơ sở dữ liệu

- SQL chuẩn: source/backend/database.sql
- SQL nộp nhóm: database.sql
- Database minh chứng: souvenirshop_midterm
- CSDL gồm 13 bảng.

### Thành phần triển khai

- Entity: product.entity.js
- Controller: seller-products.controller.ts
- Service: products.service.ts
- Module: products.module.ts
- Provider: products.providers.ts
- DTO, pipe và validation.

### API

| Chức năng | Method | Endpoint |
|---|---|---|
| Tạo | POST | /api/seller/products |
| Đọc | GET | /api/seller/products |
| Chi tiết công khai | GET | /api/products/:id |
| Cập nhật | PUT | /api/seller/products/:id |
| Ẩn | DELETE | /api/seller/products/:id |
| Xóa vĩnh viễn | DELETE | /api/seller/products/:id/permanent |

### Quy tắc nghiệp vụ

- CRUD quản lý yêu cầu đăng nhập, vai trò seller/admin.
- Người dùng thao tác trên Product thuộc shop của mình.
- Create yêu cầu shop active.
- Ẩn giữ bản ghi.
- Xóa vĩnh viễn từ chối khi có lịch sử đơn hàng/đánh giá.

### Hướng dẫn

[Xem hướng dẫn giữa kỳ](HUONG_DAN_BAI_GIUA_KY.md)

### Activity Diagram

Bổ sung liên kết đến bốn sơ đồ thật trong docs/midterm/activity.

### Minh chứng

Bổ sung liên kết đến ảnh SQL và CRUD thật trong docs/midterm/evidence.

### Cách chạy

Ghi lệnh cài thư viện, cấu hình DB, migration, seed, khởi động.

### Commit cá nhân

Bổ sung commit hash và liên kết commit đã push.
~~~~

Thay các dòng “Bổ sung…” bằng dữ liệu thật trước khi nộp. README cần phản ánh kết quả thực hiện, không để nguyên mẫu.

### 7.2. Tổ chức tài liệu

~~~text
docs/
└── midterm/
    ├── activity/
    │   ├── product-create.png
    │   ├── product-read.png
    │   ├── product-update.png
    │   └── product-delete.png
    ├── evidence/
    │   ├── 01-sql-executed.png
    │   ├── 02-database-tables.png
    │   ├── 03-product-constraints.png
    │   ├── 04-create-api.png
    │   ├── 05-create-database.png
    │   ├── 06-read-api.png
    │   ├── 07-update-api.png
    │   ├── 08-update-database.png
    │   ├── 09-hide-database.png
    │   ├── 10-delete-api.png
    │   └── 11-delete-database.png
    └── BaoCaoGiuaKy_Product.md
~~~

Đây là cấu trúc đề xuất; tài liệu hướng dẫn này không tự tạo các sơ đồ, ảnh và báo cáo mẫu ở các đường dẫn đó.

### 7.3. Rà soát trước commit

~~~powershell
git status --short
git diff --stat
git diff --check
git config user.name
git config user.email
~~~

Danh tính Git phải đúng người thực hiện. Không nhận toàn bộ thay đổi chung là phần cá nhân.

Checkout hiện có nhiều thay đổi chưa commit, gồm chuyển NestJS và nghiệp vụ khác. Cần:

1. Rà soát nền NestJS dùng chung.
2. Rà soát phần Product.
3. Chọn file/hunk đúng phạm vi.
4. Kiểm tra staged diff.
5. Commit rồi push.

Chỉ commit Product khi nền vẫn chưa có trên repo có thể khiến người chấm clone về không chạy được.

### 7.4. Khi nền NestJS chưa commit

Người phụ trách nền cần commit các phần đã rà soát:

- Package và cấu hình TypeScript.
- Điểm khởi động NestJS.
- AppModule.
- DatabaseModule.
- Guard, decorator và thành phần chung.
- Các module cần thiết.
- Việc loại bỏ backend cũ.
- SQL và hướng dẫn chạy.

Chọn từng thay đổi cần thiết, không dùng git add . để gom mọi phần việc vào commit cá nhân. Có thể dùng git add -p cho file đã được Git theo dõi và git add -- <đường-dẫn> cho file mới.

### 7.5. Khi nền đã được commit

Ví dụ stage Product và tài liệu cá nhân:

~~~powershell
git add -- source/backend/src/modules/products
git add -- source/backend/src/services/productValidation.service.js
git add -- docs/midterm
~~~

Chỉ stage docs/midterm khi thư mục có tài liệu thật. Với README có nhiều phần việc, chọn từng hunk ngay từ đầu:

~~~powershell
git add -p -- README.md
~~~

Nếu toàn bộ thay đổi README đều thuộc phạm vi commit, có thể dùng git add -- README.md thay cho git add -p. Đây là hai lựa chọn; không stage toàn file trước rồi mới chọn hunk. Nếu đã lỡ stage toàn file, dùng git restore --staged -- README.md để bỏ khỏi index (giữ nguyên nội dung file), sau đó chọn hunk lại.

Sau khi stage:

~~~powershell
git diff --cached --stat
git diff --cached --check
git diff --cached
~~~

Đọc nội dung và bảo đảm không có secrets, file runtime hoặc phần việc ngoài phạm vi.

### 7.6. Kiểm tra khả năng chạy

~~~powershell
npm.cmd --prefix source/backend test
npm.cmd --prefix source test
npm.cmd --prefix source run lint
npm.cmd --prefix source run build
~~~

Backend test đã có bước build. Phân biệt test pass, fail và skipped. Các kiểm tra tự động không thay thế minh chứng CRUD thật trên PostgreSQL.

### 7.7. Commit và push

Khi staged diff đúng:

~~~powershell
git commit -m "feat(products): complete midterm CRUD documentation and evidence"

git log -1 --oneline
git branch --show-current
git remote -v
~~~

Nếu đang làm trên main theo cách hiện tại của project:

~~~powershell
git push origin main
~~~

Nếu nhóm quy định branch/PR, làm theo quy định nhóm. Nếu push bị từ chối vì remote có commit mới, kiểm tra lịch sử và tích hợp thay đổi phù hợp; không force push để vượt qua lỗi.

### 7.8. Link nộp

Sau push, lấy:

1. Link repository.
2. Link thư mục Product trên GitHub.
3. Link commit phần việc cá nhân.
4. Link README và tài liệu giữa kỳ.

Mở lại từng link để kiểm tra file và ảnh có thật. Repo private phải cấp quyền phù hợp cho giảng viên.

Commit chỉ có file hướng dẫn này đáp ứng yêu cầu xuất bản hướng dẫn; chưa thay thế commit code CRUD, README hoàn thiện và minh chứng để nộp bài.

<a id="phan-8"></a>

## 8. Làm văn bản báo cáo nộp bài

### 8.1. Bố cục

**Trang đầu:**

- Tên môn, bài kiểm tra giữa kỳ.
- Đề tài SouvenirShop.
- Họ tên, MSSV, lớp, nhóm.
- Đối tượng Product.

**Mục 1 — GitHub:**

- Link repo.
- Link thư mục code.
- Link commit cá nhân.
- Link README.

**Mục 2 — CSDL nhóm:**

- Mục tiêu CSDL.
- Danh sách bảng và quan hệ.
- File SQL.
- Cách chạy.
- Ảnh chạy SQL, bảng và ràng buộc.

**Mục 3 — Triển khai NestJS:**

- Entity/model.
- Controller.
- Service.
- Module.
- Provider.
- DTO, pipe, validation.
- Xác thực, vai trò và giới hạn theo shop.

**Mục 4 — Create:**

- Mục tiêu, API, body.
- Code controller/service chính.
- Response 201.
- Bản ghi PostgreSQL.
- Activity Diagram Create.

**Mục 5 — Read:**

- API danh sách/chi tiết.
- Code truy vấn.
- Response 200.
- Đúng UUID, dữ liệu.
- Activity Diagram Read.

**Mục 6 — Update:**

- API, dữ liệu thay đổi.
- Code chính.
- Bảng trước/sau.
- Response 200, DB đã đổi.
- Activity Diagram Update.

**Mục 7 — Delete:**

- Phân biệt ẩn/xóa vĩnh viễn.
- API, code kiểm tra liên quan.
- Response 200.
- DB: isActive=false khi ẩn; COUNT=0 sau xóa.
- Activity Diagram Delete.
- Giải thích trường hợp 409.

**Mục 8 — README và commit:**

- Ảnh README cập nhật.
- Commit hash và link.
- Nội dung phần việc đã đưa lên repo.

Có thể làm Word và xuất PDF nếu nơi nộp cho phép. Kiểm tra định dạng do giảng viên yêu cầu trước khi nộp.

### 8.2. Code chính cần trích

Không dán toàn bộ backend. Trích:

- Khai báo Product.
- Phương thức CRUD trong controller.
- Các hàm tương ứng trong service.
- ProductsModule.
- Provider Product.
- Validation quan trọng.

Mỗi đoạn có:

~~~text
Tên file:
Tên lớp/hàm:
Mục đích:
Đoạn code:
Giải thích ngắn:
~~~

Nếu lược bỏ phần không liên quan, đánh dấu rõ. Không sửa đoạn trích khiến logic khác repo.

### 8.3. Chú thích ảnh

Ví dụ:

> Hình 4. Tạo Product bằng POST /api/seller/products, trả 201 và UUID mới.

> Hình 8. Cập nhật cùng UUID, giá từ 120000 thành 150000 và tồn kho từ 10 thành 15.

> Hình 11. Sau xóa vĩnh viễn, COUNT theo UUID bằng 0.

Chú thích cần chỉ rõ ảnh chứng minh yêu cầu nào. Không dùng ảnh khác sản phẩm/UUID mà không giải thích.

<a id="phan-9"></a>

## 9. Checklist, trình tự demo và quy định làm bài

### 9.1. Phần nhóm

- [ ] Có SQL đầy đủ, đúng project.
- [ ] Hai bản SQL đồng bộ.
- [ ] Có khóa chính và khóa ngoại.
- [ ] SQL đã chạy lên PostgreSQL.
- [ ] Có ảnh kết quả thực thi.
- [ ] Có ảnh database, bảng và ràng buộc.

### 9.2. Phần cá nhân

- [ ] Product đã phân tích, không trùng thành viên.
- [ ] Có Entity, Controller, Service, Module, Provider.
- [ ] Create 201 và bản ghi DB.
- [ ] Read 200, dữ liệu đúng.
- [ ] Update 200, dữ liệu DB thay đổi.
- [ ] Delete có API và DB chứng minh.
- [ ] Phân biệt ẩn với xóa vĩnh viễn.
- [ ] Có bốn Activity Diagram khớp code.
- [ ] README đủ thông tin, API, cách chạy và minh chứng.
- [ ] Nền NestJS và code cần thiết đã commit/push.
- [ ] Sơ đồ, ảnh, tài liệu đã xuất hiện trên GitHub.

### 9.3. Văn bản nộp

- [ ] Thông tin sinh viên đúng.
- [ ] Có link GitHub và commit cá nhân.
- [ ] Có code chính và giải thích.
- [ ] Sơ đồ rõ chữ.
- [ ] Ảnh có chú thích.
- [ ] Không có mật khẩu, token, .env hoặc dữ liệu riêng tư.
- [ ] Link truy cập được với người chấm.
- [ ] Không còn placeholder trong bản nộp.
- [ ] Không ghi kết quả mong đợi thành kết quả đã thực hiện.

### 9.4. Trình tự demo

1. Mở file SQL và giải thích products, khóa chính/khóa ngoại.
2. Cho xem database đã tạo và các bảng.
3. Cho xem backend NestJS và các file Product.
4. Đăng nhập seller, kiểm tra shop active.
5. Create Product mới, lưu UUID.
6. Read cùng UUID.
7. Update, đối chiếu trước/sau bằng SQL.
8. Thử dữ liệu không hợp lệ, chỉ ra 400.
9. Ẩn: isActive=false và public detail 404.
10. Xóa vĩnh viễn: COUNT theo UUID bằng 0.
11. Trình bày bốn Activity Diagram.
12. Mở README, commit và link GitHub.

Bài giữa kỳ tập trung CSDL, CRUD và tài liệu theo đề. Không cần thêm tích hợp thanh toán hoặc dịch vụ bên ngoài để chứng minh bốn thao tác Product.

### 9.5. Quy định làm bài

Theo đề:

- Được tham khảo tài liệu.
- Không nói chuyện trong lúc thi.
- Được dùng GitHub Issues/Discussions để phân chia, trao đổi công việc theo hình thức giảng viên cho phép.

Trước giờ thi, chuẩn bị môi trường, đọc và hiểu code, sơ đồ, lệnh demo. Trong giờ thi, tuân thủ quy định liên lạc và nộp bài.

**Thứ tự thực hiện:** SQL và minh chứng → chạy NestJS → CRUD một Product mới → sơ đồ → README/báo cáo → rà soát commit/push → kiểm tra link nộp.

<a id="tham-khao"></a>

## 10. Tài liệu tham khảo

- [NestJS — Providers](https://docs.nestjs.com/providers): service/provider và dependency injection.
- [Visual Paradigm — How to Draw an Activity Diagram in UML](https://www.visual-paradigm.com/tutorials/how-to-draw-activity-diagram-in-uml/): ký hiệu và cách dựng activity diagram.
- [Visual Paradigm Online](https://online.visual-paradigm.com/): công cụ được dẫn trong đề.
- README, SQL, model, controller, service, module, provider và validator trong project: nguồn để đối chiếu đường dẫn/API/nghiệp vụ.

Nếu API hoặc schema được sửa sau này, cập nhật ví dụ và sơ đồ theo code mới trước khi sử dụng tài liệu cho bài nộp.
