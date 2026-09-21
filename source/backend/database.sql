-- ==========================================================
-- SOUVENIRSHOP - HỆ THỐNG QUẢN LÝ QUÀ LƯU NIỆM VIỆT NAM
-- Cơ sở dữ liệu: PostgreSQL (14+)
-- Script DDL (Tạo bảng) & DML (Dữ liệu mẫu)
-- Phục vụ bài tập nhóm môn Thiết kế web nâng cao
-- ==========================================================

-- Bật extension tạo UUID ngẫu nhiên
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. BẢNG NGƯỜI DÙNG (users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR NOT NULL,
    phone VARCHAR(20),
    avatar TEXT,
    role VARCHAR(20) DEFAULT 'buyer',
    "isActive" BOOLEAN DEFAULT true,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 2. BẢNG CỬA HÀNG / GIAN HÀNG (shops)
CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ownerId" UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(160) UNIQUE NOT NULL,
    description TEXT,
    logo TEXT,
    banner TEXT,
    location VARCHAR(200),
    rating FLOAT DEFAULT 0,
    "reviewCount" INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'approved',
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 3. BẢNG VÙNG MIỀN VĂN HÓA (regions)
CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    "shortDescription" TEXT,
    history TEXT,
    "centerLat" DECIMAL(9,6) NOT NULL,
    "centerLng" DECIMAL(9,6) NOT NULL,
    "mapX" DECIMAL(5,2) NOT NULL,
    "mapY" DECIMAL(5,2) NOT NULL,
    "heroMedia" TEXT,
    theme JSONB NOT NULL DEFAULT '{}'::jsonb,
    "isFeatured" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 4. BẢNG LÀNG NGHỀ TRUYỀN THỐNG (craft_villages)
CREATE TABLE IF NOT EXISTS craft_villages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "regionId" UUID NOT NULL,
    name VARCHAR(160) NOT NULL,
    slug VARCHAR(180) UNIQUE NOT NULL,
    summary TEXT,
    "foundedYear" INTEGER,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    "previewMedia" TEXT,
    crafts TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    artisans JSONB NOT NULL DEFAULT '[]'::jsonb,
    "isFeatured" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 5. BẢNG SẢN PHẨM (products)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "shopId" UUID NOT NULL,
    "craftVillageId" UUID,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(15,0) NOT NULL,
    "salePrice" DECIMAL(15,0),
    stock INTEGER DEFAULT 0,
    images TEXT[],
    category VARCHAR(100),
    "isActive" BOOLEAN DEFAULT true,
    "isFlashSale" BOOLEAN DEFAULT false,
    sold INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 6. BẢNG ĐƠN HÀNG (orders)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "buyerId" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    total DECIMAL(15,0) NOT NULL,
    "shippingFee" DECIMAL(15,0) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'pending',
    "paymentMethod" VARCHAR(50),
    "paymentStatus" VARCHAR(20) DEFAULT 'unpaid',
    "shippingAddress" JSONB,
    carrier VARCHAR(100),
    "trackingCode" VARCHAR(120),
    "currentLocation" VARCHAR(250),
    "trackingHistory" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "estimatedDeliveryAt" TIMESTAMP,
    "shippedAt" TIMESTAMP,
    "deliveredAt" TIMESTAMP,
    note TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 7. BẢNG CHI TIẾT ĐƠN HÀNG (order_items)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    image TEXT,
    price DECIMAL(15,0) NOT NULL,
    quantity INTEGER NOT NULL
);

-- 8. BẢNG ĐỊA CHỈ GIAO HÀNG (addresses)
CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    detail VARCHAR(300) NOT NULL,
    district VARCHAR(100),
    city VARCHAR(100),
    "isDefault" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 9. BẢNG ĐÁNH GIÁ SẢN PHẨM (reviews)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "productId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    images TEXT[],
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- ==========================================================
-- THIẾT LẬP RÀNG BUỘC KHÓA NGOẠI (FOREIGN KEYS)
-- ==========================================================

ALTER TABLE shops
    DROP CONSTRAINT IF EXISTS shops_owner_id_fkey,
    ADD CONSTRAINT shops_owner_id_fkey FOREIGN KEY ("ownerId") REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE craft_villages
    DROP CONSTRAINT IF EXISTS craft_villages_region_id_fkey,
    ADD CONSTRAINT craft_villages_region_id_fkey FOREIGN KEY ("regionId") REFERENCES regions(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_shop_id_fkey,
    ADD CONSTRAINT products_shop_id_fkey FOREIGN KEY ("shopId") REFERENCES shops(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_craft_village_id_fkey,
    ADD CONSTRAINT products_craft_village_id_fkey FOREIGN KEY ("craftVillageId") REFERENCES craft_villages(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE addresses
    DROP CONSTRAINT IF EXISTS addresses_user_id_fkey,
    ADD CONSTRAINT addresses_user_id_fkey FOREIGN KEY ("userId") REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE orders
    DROP CONSTRAINT IF EXISTS orders_buyer_id_fkey,
    ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY ("buyerId") REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE orders
    DROP CONSTRAINT IF EXISTS orders_shop_id_fkey,
    ADD CONSTRAINT orders_shop_id_fkey FOREIGN KEY ("shopId") REFERENCES shops(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE order_items
    DROP CONSTRAINT IF EXISTS order_items_order_id_fkey,
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY ("orderId") REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE order_items
    DROP CONSTRAINT IF EXISTS order_items_product_id_fkey,
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY ("productId") REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- ==========================================================
-- DỮ LIỆU MẪU (SEED DATA)
-- ==========================================================

-- Mật khẩu mặc định cho các tài khoản mẫu: 123456 (đã băm bằng bcrypt)
-- Hash: $2a$10$wN1QyvE8q1.oR4g43vEfe.1WJ81V06wN083Zeq5sO4W8g9/8s69n2

INSERT INTO users (id, name, email, password, phone, role, "isActive")
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'Admin Quản Trị', 'admin@souvenirshop.vn', '$2a$10$wN1QyvE8q1.oR4g43vEfe.1WJ81V06wN083Zeq5sO4W8g9/8s69n2', '0901234567', 'admin', true),
    ('a0000000-0000-0000-0000-000000000002', 'Nghệ Nhân Bát Tràng (Seller)', 'seller@souvenirshop.vn', '$2a$10$wN1QyvE8q1.oR4g43vEfe.1WJ81V06wN083Zeq5sO4W8g9/8s69n2', '0912345678', 'seller', true),
    ('a0000000-0000-0000-0000-000000000003', 'Nguyễn Văn Mua (Buyer)', 'buyer@souvenirshop.vn', '$2a$10$wN1QyvE8q1.oR4g43vEfe.1WJ81V06wN083Zeq5sO4W8g9/8s69n2', '0987654321', 'buyer', true)
ON CONFLICT (email) DO NOTHING;

-- Vùng miền
INSERT INTO regions (id, name, slug, "shortDescription", history, "centerLat", "centerLng", "mapX", "mapY", theme, "isFeatured")
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Hà Nội', 'ha-noi', 'Nơi lớp men gốm, tơ lụa và nhịp phố cũ gặp nhau.', 'Hà Nội lưu giữ một mạng lưới làng nghề lâu đời bao quanh đô thị.', 21.027764, 105.834160, 35, 14, '{"primary": "#174C45"}'::jsonb, true),
    ('b0000000-0000-0000-0000-000000000002', 'Huế', 'hue', 'Sắc trầm cung đình đi cùng nón lá và tranh làng.', 'Không gian nghề ở Huế chịu ảnh hưởng của nhịp sống kinh đô xưa.', 16.463713, 107.590866, 46, 44, '{"primary": "#5A416C"}'::jsonb, true)
ON CONFLICT (slug) DO NOTHING;

-- Làng nghề
INSERT INTO craft_villages (id, "regionId", name, slug, summary, "foundedYear", latitude, longitude, crafts, "isFeatured")
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Làng gốm Bát Tràng', 'gom-bat-trang', 'Điểm dừng bên sông Hồng nơi đất nung thành quà lưu niệm thủ công.', 1400, 20.976116, 105.913017, ARRAY['Gốm', 'Men thủ công'], true),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Làng nón Tây Hồ', 'non-tay-ho', 'Chiếc nón lá thanh mảnh mang nét riêng của xứ Huế.', 1800, 16.398200, 107.664800, ARRAY['Nón lá', 'Khâu tay'], true)
ON CONFLICT (slug) DO NOTHING;

-- Gian hàng
INSERT INTO shops (id, "ownerId", name, slug, description, location, rating, "reviewCount", status)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Gốm Tinh Hoa Bát Tràng', 'gom-tinh-hoa-bat-trang', 'Chuyên cung cấp sản phẩm gốm men lam, men rạn truyền thống tinh xảo.', 'Gia Lâm, Hà Nội', 4.9, 128, 'approved')
ON CONFLICT (slug) DO NOTHING;

-- Sản phẩm
INSERT INTO products (id, "shopId", "craftVillageId", name, description, price, "salePrice", stock, images, category, "isActive", sold)
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Bình hoa gốm men rạn vẽ hoa sen', 'Bình gốm thủ công nung ở 1200 độ C, họa tiết hoa sen truyền thống.', 350000, 299000, 45, ARRAY['/images/binh-gom-sen.jpg'], 'Gốm sứ', true, 18),
    ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Bộ ấm chén trà tử sa Bát Tràng', 'Bộ ấm chén giữ nhiệt tốt, lưu hương vị trà tinh tế.', 650000, 590000, 20, ARRAY['/images/am-chen.jpg'], 'Gốm sứ', true, 32),
    ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Nón bài thơ xứ Huế khâu tay', 'Chiếc nón lá thanh tao lồng tranh và thơ khi soi dưới ánh sáng.', 180000, 150000, 50, ARRAY['/images/non-hue.jpg'], 'Thủ công mỹ nghệ', true, 41)
ON CONFLICT (id) DO NOTHING;

-- Đơn hàng mẫu
INSERT INTO orders (id, "buyerId", "shopId", total, "shippingFee", status, "paymentMethod", "paymentStatus", carrier, "trackingCode", note)
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 479000, 30000, 'processing', 'COD', 'unpaid', 'Giao Hàng Nhanh', 'GHN123456VN', 'Gói hàng cẩn thận dễ vỡ')
ON CONFLICT (id) DO NOTHING;

-- Chi tiết đơn hàng mẫu
INSERT INTO order_items (id, "orderId", "productId", name, image, price, quantity)
VALUES
    ('f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Bình hoa gốm men rạn vẽ hoa sen', '/images/binh-gom-sen.jpg', 299000, 1),
    ('f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'Nón bài thơ xứ Huế khâu tay', '/images/non-hue.jpg', 150000, 1)
ON CONFLICT (id) DO NOTHING;
