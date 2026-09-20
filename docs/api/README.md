# SouvenirShop API Collection

Thu muc nay chua Postman collection de test API local cua SouvenirShop.

## File

- `SouvenirShop.postman_collection.json`: collection endpoint chinh.
- `SouvenirShop.local.postman_environment.json`: environment local voi `baseUrl=http://localhost:3000`.

## Cach dung

1. Chay backend:

```bash
cd backend
npm.cmd run dev
```

2. Import 2 file JSON vao Postman:

- Collection: `SouvenirShop.postman_collection.json`
- Environment: `SouvenirShop.local.postman_environment.json`

3. Chon environment `SouvenirShop Local`.

4. Chay cac request login truoc:

- `Auth / POST /api/auth/login buyer`
- `Auth / POST /api/auth/login seller`
- `Auth / POST /api/auth/login admin`

Postman se tu luu `buyerToken`, `sellerToken`, `adminToken`.

5. Chay `Buyer / GET /api/products` de tu luu `productId` va `shopSlug`.

6. Chay tiep cac request buyer/seller/admin can test.

## Luu y

- `Buyer / Profile` dung nhom API `GET/PUT /api/users/profile`, `GET/POST/PUT/DELETE /api/users/addresses` va `PUT /api/users/password`; tat ca can Bearer token cua user dang nhap.
- `Buyer / POST /api/orders` tao don hang that trong database local va luu `orderId`. Request bat buoc co `Idempotency-Key` de chong tao don trung.
- Giu nguyen `checkoutKey` khi thu lai cung mot lan thanh toan. Doi `checkoutKey` trong environment truoc khi bat dau mot gio hang moi.
- Neu tao don test, nen chay `Buyer / PUT /api/orders/:id/cancel` sau khi test de hoan ton kho.
- `Buyer / POST /api/payment/vietqr/:orderId` goi VietQR.io that, can backend co cau hinh VietQR trong `backend/.env`.
- `Seller / POST /api/uploads/image` can chon file anh trong Postman form-data truoc khi gui.
- Upload mac dinh tra `provider=local`. Neu backend co `UPLOAD_PROVIDER=cloudinary` va du `CLOUDINARY_*`, response se tra `provider=cloudinary` va URL Cloudinary.
- Cac request admin co bien `shopId` hoac `userId` can dien thu cong neu muon thao tac vao ban ghi cu the.

## API ban do van hoa

Chay migration va seed rieng cho du lieu van hoa (khong cap nhat tai khoan test):

```bash
cd backend
npm.cmd run migrate
npm.cmd run seed:culture
```

Endpoint cong khai:

- `GET /api/culture/regions`: danh sach pin tren ban do va lang nghe noi bat.
- `GET /api/culture/regions/:slug`: lich su, lang nghe, nghe nhan mau va san pham cua mot vung.
- `GET /api/culture/products?craftVillageId=<uuid>`: san pham theo ID lang nghe.
- `GET /api/culture/products?lat=20.976116&lng=105.913017&radiusKm=10`: san pham quanh toa do; `radiusKm` toi da 500.

Smoke test voi backend dang chay:

```bash
npm.cmd run smoke:culture
```
