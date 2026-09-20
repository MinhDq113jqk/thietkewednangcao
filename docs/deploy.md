# Deploy Notes

## Backend environment

Required for normal API runtime:

```text
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
CLIENT_URL=https://your-frontend.example.com
CORS_ORIGINS=https://your-frontend.example.com,https://admin.your-frontend.example.com
```

Cloud upload:

```text
UPLOAD_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=souvenirshop
```

If `UPLOAD_PROVIDER` is omitted, the backend uses Cloudinary only when all Cloudinary credentials are present; otherwise it keeps local uploads.

SMTP:

```text
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=SouvenirShop <no-reply@example.com>
```

VietQR:

```text
VIETQR_CLIENT_ID=...
VIETQR_API_KEY=...
BANK_ACCOUNT_NO=...
BANK_ACCOUNT_NAME=TEN_CHU_TAI_KHOAN_KHONG_DAU
BANK_ACQ_ID=970422
```

## CI

GitHub Actions workflow: `.github/workflows/ci.yml`.

The workflow runs:

```bash
npm ci
npm test
npm run lint
npm run build
cd backend && npm ci
cd backend && node --check src/app.js
```
