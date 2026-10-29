-- SouvenirShop: schema only; demo data is added separately with npm run seed:demo.
-- Canonical source: source/backend/database.sql. Root database.sql is a generated mirror.
-- Apply using npm run migrate, or psql --single-transaction -v ON_ERROR_STOP=1 -f database.sql.

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
  "authVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS "authVersion" INTEGER NOT NULL DEFAULT 0;

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
  status VARCHAR(20) DEFAULT 'pending',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

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
  "dataSource" VARCHAR(20) NOT NULL DEFAULT 'legacy',
  "isActive" BOOLEAN DEFAULT true,
  "isFlashSale" BOOLEAN DEFAULT false,
  sold INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

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
  note TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  image TEXT,
  price DECIMAL(15,0) NOT NULL,
  quantity INTEGER NOT NULL
);

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

CREATE TABLE IF NOT EXISTS checkout_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "buyerId" UUID NOT NULL,
  "idempotencyKey" VARCHAR(128) NOT NULL,
  "requestHash" VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'processing',
  "orderIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL UNIQUE,
  provider VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  amount DECIMAL(15,0) NOT NULL,
  reference VARCHAR(120),
  "confirmedAt" TIMESTAMP,
  "confirmedBy" UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "buyerId" UUID NOT NULL,
  "shopId" UUID NOT NULL,
  "productId" UUID,
  "lastMessage" VARCHAR(500),
  "lastMessageAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" UUID NOT NULL,
  "senderId" UUID NOT NULL,
  body TEXT NOT NULL,
  "readAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chat_messages_body_length
    CHECK (char_length(body) BETWEEN 1 AND 2000)
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "trackingCode" VARCHAR(120);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "currentLocation" VARCHAR(250);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "trackingHistory" JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "estimatedDeliveryAt" TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "shippedAt" TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP;
ALTER TABLE products ADD COLUMN IF NOT EXISTS "craftVillageId" UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS "dataSource" VARCHAR(20) NOT NULL DEFAULT 'legacy';

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_data_source_valid' AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_data_source_valid
      CHECK ("dataSource" IN ('demo', 'seller', 'legacy'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shops_owner_id_fkey' AND conrelid = 'shops'::regclass
  ) THEN
    ALTER TABLE shops
      ADD CONSTRAINT shops_owner_id_fkey
      FOREIGN KEY ("ownerId") REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_shop_id_fkey' AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_shop_id_fkey
      FOREIGN KEY ("shopId") REFERENCES shops(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'craft_villages_region_id_fkey' AND conrelid = 'craft_villages'::regclass
  ) THEN
    ALTER TABLE craft_villages
      ADD CONSTRAINT craft_villages_region_id_fkey
      FOREIGN KEY ("regionId") REFERENCES regions(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_craft_village_id_fkey' AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_craft_village_id_fkey
      FOREIGN KEY ("craftVillageId") REFERENCES craft_villages(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'addresses_user_id_fkey' AND conrelid = 'addresses'::regclass
  ) THEN
    ALTER TABLE addresses
      ADD CONSTRAINT addresses_user_id_fkey
      FOREIGN KEY ("userId") REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_buyer_id_fkey' AND conrelid = 'orders'::regclass
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_buyer_id_fkey
      FOREIGN KEY ("buyerId") REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_shop_id_fkey' AND conrelid = 'orders'::regclass
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_shop_id_fkey
      FOREIGN KEY ("shopId") REFERENCES shops(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'checkout_attempts_buyer_id_fkey'
      AND conrelid = 'checkout_attempts'::regclass
  ) THEN
    ALTER TABLE checkout_attempts
      ADD CONSTRAINT checkout_attempts_buyer_id_fkey
      FOREIGN KEY ("buyerId") REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_order_id_fkey' AND conrelid = 'order_items'::regclass
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_order_id_fkey
      FOREIGN KEY ("orderId") REFERENCES orders(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_product_id_fkey' AND conrelid = 'order_items'::regclass
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_product_id_fkey
      FOREIGN KEY ("productId") REFERENCES products(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reviews_product_id_fkey' AND conrelid = 'reviews'::regclass
  ) THEN
    ALTER TABLE reviews
      ADD CONSTRAINT reviews_product_id_fkey
      FOREIGN KEY ("productId") REFERENCES products(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reviews_user_id_fkey' AND conrelid = 'reviews'::regclass
  ) THEN
    ALTER TABLE reviews
      ADD CONSTRAINT reviews_user_id_fkey
      FOREIGN KEY ("userId") REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reviews_order_id_fkey' AND conrelid = 'reviews'::regclass
  ) THEN
    ALTER TABLE reviews
      ADD CONSTRAINT reviews_order_id_fkey
      FOREIGN KEY ("orderId") REFERENCES orders(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conversations_buyer_id_fkey'
      AND conrelid = 'conversations'::regclass
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT conversations_buyer_id_fkey
      FOREIGN KEY ("buyerId") REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conversations_shop_id_fkey'
      AND conrelid = 'conversations'::regclass
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT conversations_shop_id_fkey
      FOREIGN KEY ("shopId") REFERENCES shops(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conversations_product_id_fkey'
      AND conrelid = 'conversations'::regclass
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT conversations_product_id_fkey
      FOREIGN KEY ("productId") REFERENCES products(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chat_messages_conversation_id_fkey'
      AND conrelid = 'chat_messages'::regclass
  ) THEN
    ALTER TABLE chat_messages
      ADD CONSTRAINT chat_messages_conversation_id_fkey
      FOREIGN KEY ("conversationId") REFERENCES conversations(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chat_messages_sender_id_fkey'
      AND conrelid = 'chat_messages'::regclass
  ) THEN
    ALTER TABLE chat_messages
      ADD CONSTRAINT chat_messages_sender_id_fkey
      FOREIGN KEY ("senderId") REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_transactions_order_id_fkey'
      AND conrelid = 'payment_transactions'::regclass
  ) THEN
    ALTER TABLE payment_transactions
      ADD CONSTRAINT payment_transactions_order_id_fkey
      FOREIGN KEY ("orderId") REFERENCES orders(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_transactions_confirmed_by_fkey'
      AND conrelid = 'payment_transactions'::regclass
  ) THEN
    ALTER TABLE payment_transactions
      ADD CONSTRAINT payment_transactions_confirmed_by_fkey
      FOREIGN KEY ("confirmedBy") REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'regions_coordinates_valid' AND conrelid = 'regions'::regclass
  ) THEN
    ALTER TABLE regions ADD CONSTRAINT regions_coordinates_valid
      CHECK (
        "centerLat" BETWEEN -90 AND 90
        AND "centerLng" BETWEEN -180 AND 180
        AND "mapX" BETWEEN 0 AND 100
        AND "mapY" BETWEEN 0 AND 100
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'craft_villages_coordinates_valid' AND conrelid = 'craft_villages'::regclass
  ) THEN
    ALTER TABLE craft_villages ADD CONSTRAINT craft_villages_coordinates_valid
      CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'craft_villages_founded_year_valid' AND conrelid = 'craft_villages'::regclass
  ) THEN
    ALTER TABLE craft_villages ADD CONSTRAINT craft_villages_founded_year_valid
      CHECK ("foundedYear" IS NULL OR "foundedYear" BETWEEN 1 AND 2200);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_price_positive' AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_price_positive CHECK (price > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_stock_nonnegative' AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_stock_nonnegative CHECK (stock >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_sold_nonnegative' AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_sold_nonnegative CHECK (sold >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_sale_price_valid' AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_sale_price_valid
      CHECK ("salePrice" IS NULL OR ("salePrice" > 0 AND "salePrice" <= price));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_amounts_nonnegative' AND conrelid = 'orders'::regclass
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_amounts_nonnegative
      CHECK (total >= 0 AND "shippingFee" >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_values_valid' AND conrelid = 'order_items'::regclass
  ) THEN
    ALTER TABLE order_items ADD CONSTRAINT order_items_values_valid
      CHECK (price >= 0 AND quantity > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reviews_rating_range' AND conrelid = 'reviews'::regclass
  ) THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_transactions_values_valid'
      AND conrelid = 'payment_transactions'::regclass
  ) THEN
    ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_values_valid
      CHECK (
        amount > 0
        AND provider IN ('vietqr', 'cod', 'manual')
        AND status IN ('pending', 'paid', 'refunded', 'failed')
      );
  END IF;
END
$constraints$;

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
-- Commercial tasks 1-2. Existing unpaid reservations get a 30 minute grace
-- period on the first migration; rerunning migration never extends a deadline.
DO $expiry_upgrade$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'paymentExpiresAt') THEN
    ALTER TABLE orders ADD COLUMN "paymentExpiresAt" TIMESTAMPTZ;
    UPDATE orders SET "paymentExpiresAt" = CURRENT_TIMESTAMP + INTERVAL '30 minutes'
    WHERE "paymentMethod" = 'bank_transfer' AND "paymentStatus" = 'unpaid'
      AND status IN ('pending', 'confirmed', 'packing');
  END IF;
END $expiry_upgrade$;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "expiredAt" TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS orders_payment_expiry_due ON orders("paymentExpiresAt", id)
  WHERE "paymentMethod" = 'bank_transfer' AND "paymentStatus" = 'unpaid'
    AND status IN ('pending', 'confirmed', 'packing');

CREATE TABLE IF NOT EXISTS bank_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(120) NOT NULL,
  amount DECIMAL(15,0) NOT NULL CHECK (amount > 0),
  "receivedAt" TIMESTAMPTZ NOT NULL,
  "transferContent" VARCHAR(500) NOT NULL,
  evidence VARCHAR(1000) NOT NULL CHECK (length(trim(evidence)) >= 5),
  "orderId" UUID REFERENCES orders(id) ON DELETE RESTRICT,
  "recordedBy" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT bank_receipts_reference_format CHECK (
    reference = upper(trim(reference)) AND reference ~ '^[A-Z0-9][A-Z0-9._:/-]{2,119}$'
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS bank_receipts_reference_unique ON bank_receipts(reference);
CREATE INDEX IF NOT EXISTS bank_receipts_created ON bank_receipts("createdAt" DESC, id);
CREATE INDEX IF NOT EXISTS bank_receipts_order ON bank_receipts("orderId");

CREATE TABLE IF NOT EXISTS payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "receiptId" UUID NOT NULL REFERENCES bank_receipts(id) ON DELETE RESTRICT,
  "orderId" UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  amount DECIMAL(15,0) NOT NULL CHECK (amount > 0),
  note VARCHAR(1000) NOT NULL,
  "allocatedBy" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_allocations_receipt_unique ON payment_allocations("receiptId");
CREATE INDEX IF NOT EXISTS payment_allocations_order ON payment_allocations("orderId");
ALTER TABLE payment_allocations ADD COLUMN IF NOT EXISTS "legacyVerification" BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION commercial_fact_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Financial facts cannot be edited; record a separate adjustment' USING ERRCODE = '23514';
END $$;
DROP TRIGGER IF EXISTS bank_receipts_immutable ON bank_receipts;
CREATE TRIGGER bank_receipts_immutable BEFORE UPDATE ON bank_receipts
  FOR EACH ROW EXECUTE FUNCTION commercial_fact_immutable();
DROP TRIGGER IF EXISTS payment_allocations_immutable ON payment_allocations;
CREATE TRIGGER payment_allocations_immutable BEFORE UPDATE ON payment_allocations
  FOR EACH ROW EXECUTE FUNCTION commercial_fact_immutable();

CREATE OR REPLACE FUNCTION validate_payment_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE receipt bank_receipts%ROWTYPE; target orders%ROWTYPE; applied NUMERIC;
BEGIN
  SELECT * INTO receipt FROM bank_receipts WHERE id = NEW."receiptId" FOR UPDATE;
  SELECT * INTO target FROM orders WHERE id = NEW."orderId" FOR UPDATE;
  SELECT coalesce(sum(amount), 0) INTO applied FROM payment_allocations WHERE "orderId" = target.id;
  IF receipt.id IS NULL OR target.id IS NULL OR NEW.amount > receipt.amount
    OR NEW.amount + applied > target.total + coalesce(target."shippingFee", 0)
    OR target."paymentMethod" <> 'bank_transfer' OR target."paymentStatus" <> 'unpaid'
    OR target.status IN ('cancelled', 'returned') OR target."expiredAt" IS NOT NULL
    OR (target."paymentExpiresAt" IS NOT NULL AND target."paymentExpiresAt" <= clock_timestamp())
    OR receipt."receivedAt" + INTERVAL '1 second' < target."createdAt"
    OR (target."paymentExpiresAt" IS NOT NULL AND receipt."receivedAt" > target."paymentExpiresAt") THEN
    RAISE EXCEPTION 'Invalid payment allocation' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS payment_allocations_validate ON payment_allocations;
CREATE TRIGGER payment_allocations_validate BEFORE INSERT ON payment_allocations
  FOR EACH ROW EXECUTE FUNCTION validate_payment_allocation();

CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products("shopId");
-- Commercial tasks 3-4: immutable money facts and separately reviewed returns.
CREATE TABLE IF NOT EXISTS return_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  "buyerId" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "requestKey" VARCHAR(120) NOT NULL, "requestHash" VARCHAR(64) NOT NULL,
  kind VARCHAR(30) NOT NULL CHECK (kind IN ('return_refund', 'exchange', 'complaint')),
  status VARCHAR(30) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'received', 'resolved')),
  reason VARCHAR(2000) NOT NULL, evidence JSONB NOT NULL DEFAULT '[]',
  "requestedAmount" DECIMAL(15,0) NOT NULL DEFAULT 0 CHECK ("requestedAmount" >= 0),
  "approvedAmount" DECIMAL(15,0) NOT NULL DEFAULT 0 CHECK ("approvedAmount" >= 0 AND "approvedAmount" <= "requestedAmount"),
  history JSONB NOT NULL DEFAULT '[]', replacement JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS return_cases_request_unique ON return_cases("buyerId", "requestKey");
CREATE INDEX IF NOT EXISTS return_cases_order ON return_cases("orderId", "createdAt");
CREATE TABLE IF NOT EXISTS return_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "caseId" UUID NOT NULL REFERENCES return_cases(id) ON DELETE RESTRICT,
  "orderItemId" UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0), restock BOOLEAN
);
CREATE UNIQUE INDEX IF NOT EXISTS return_lines_item_unique ON return_lines("caseId", "orderItemId");
CREATE TABLE IF NOT EXISTS cod_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  kind VARCHAR(30) NOT NULL CHECK (kind IN ('collection', 'remittance')),
  reference VARCHAR(120) NOT NULL CHECK (reference = upper(trim(reference)) AND reference ~ '^[A-Z0-9][A-Z0-9._:/-]{2,119}$'),
  amount DECIMAL(15,0) NOT NULL CHECK (amount >= 0),
  fee DECIMAL(15,0) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  "occurredAt" TIMESTAMPTZ NOT NULL, evidence VARCHAR(1000) NOT NULL CHECK (length(trim(evidence)) >= 5),
  note VARCHAR(1000) NOT NULL CHECK (length(trim(note)) >= 10),
  "recordedBy" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((kind = 'collection' AND amount > 0 AND fee = 0) OR (kind = 'remittance' AND amount + fee > 0))
);
CREATE UNIQUE INDEX IF NOT EXISTS cod_entries_reference_unique ON cod_entries(reference);
CREATE UNIQUE INDEX IF NOT EXISTS cod_entries_collection_unique ON cod_entries("orderId") WHERE kind = 'collection';
CREATE INDEX IF NOT EXISTS cod_entries_order ON cod_entries("orderId", kind);
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" UUID REFERENCES orders(id) ON DELETE RESTRICT,
  "receiptId" UUID REFERENCES bank_receipts(id) ON DELETE RESTRICT,
  "caseId" UUID REFERENCES return_cases(id) ON DELETE RESTRICT,
  source VARCHAR(30) NOT NULL CHECK (source IN ('receipt_excess', 'bank_order', 'cod_order')),
  reference VARCHAR(120) NOT NULL CHECK (reference = upper(trim(reference)) AND reference ~ '^[A-Z0-9][A-Z0-9._:/-]{2,119}$'),
  amount DECIMAL(15,0) NOT NULL CHECK (amount > 0), "occurredAt" TIMESTAMPTZ NOT NULL,
  evidence VARCHAR(1000) NOT NULL CHECK (length(trim(evidence)) >= 5),
  note VARCHAR(1000) NOT NULL CHECK (length(trim(note)) >= 10),
  "recordedBy" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((source = 'receipt_excess' AND "receiptId" IS NOT NULL AND "orderId" IS NULL AND "caseId" IS NULL)
    OR (source = 'bank_order' AND "receiptId" IS NOT NULL AND "orderId" IS NOT NULL)
    OR (source = 'cod_order' AND "receiptId" IS NULL AND "orderId" IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS refunds_reference_unique ON refunds(reference);
CREATE INDEX IF NOT EXISTS refunds_order ON refunds("orderId");
CREATE INDEX IF NOT EXISTS refunds_receipt ON refunds("receiptId");
CREATE INDEX IF NOT EXISTS refunds_case ON refunds("caseId");
DROP TRIGGER IF EXISTS refunds_immutable ON refunds;
CREATE TRIGGER refunds_immutable BEFORE UPDATE ON refunds FOR EACH ROW EXECUTE FUNCTION commercial_fact_immutable();
DROP TRIGGER IF EXISTS cod_entries_immutable ON cod_entries;
CREATE TRIGGER cod_entries_immutable BEFORE UPDATE ON cod_entries FOR EACH ROW EXECUTE FUNCTION commercial_fact_immutable();

CREATE OR REPLACE FUNCTION validate_cod_entry() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target orders%ROWTYPE; collected NUMERIC; remitted NUMERIC; collection_time TIMESTAMPTZ;
BEGIN
  SELECT * INTO target FROM orders WHERE id = NEW."orderId" FOR UPDATE;
  IF target.id IS NULL OR target."paymentMethod" <> 'cod' OR target.status NOT IN ('delivered', 'returned')
    OR target."trackingCode" IS NULL OR target.carrier IS NULL OR NEW."occurredAt" > clock_timestamp() + INTERVAL '1 minute'
    OR NEW."occurredAt" + INTERVAL '1 second' < coalesce(target."deliveredAt", target."createdAt") THEN
    RAISE EXCEPTION 'Invalid COD event' USING ERRCODE = '23514';
  END IF;
  IF NEW.kind = 'remittance' THEN
    SELECT amount, "occurredAt" INTO collected, collection_time FROM cod_entries WHERE "orderId" = target.id AND kind = 'collection';
    SELECT coalesce(sum(amount + fee), 0) INTO remitted FROM cod_entries WHERE "orderId" = target.id AND kind = 'remittance';
    IF collected IS NULL OR remitted + NEW.amount + NEW.fee > collected OR NEW."occurredAt" + INTERVAL '1 second' < collection_time THEN
      RAISE EXCEPTION 'COD remittance exceeds collection or predates it' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS cod_entries_validate ON cod_entries;
CREATE TRIGGER cod_entries_validate BEFORE INSERT ON cod_entries FOR EACH ROW EXECUTE FUNCTION validate_cod_entry();

-- A bank credit must not fund both a transfer order and a COD remittance.
CREATE OR REPLACE FUNCTION validate_bank_credit_reference() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'cod_entries' THEN
    IF NEW.kind <> 'remittance' THEN RETURN NEW; END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.reference, 20261020));
  IF (TG_TABLE_NAME = 'bank_receipts' AND EXISTS (SELECT 1 FROM cod_entries WHERE kind = 'remittance' AND reference = NEW.reference))
    OR (TG_TABLE_NAME = 'cod_entries' AND EXISTS (SELECT 1 FROM bank_receipts WHERE reference = NEW.reference)) THEN
    RAISE EXCEPTION 'Bank credit reference already recorded in another ledger' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bank_receipts_credit_reference ON bank_receipts;
CREATE TRIGGER bank_receipts_credit_reference BEFORE INSERT ON bank_receipts FOR EACH ROW EXECUTE FUNCTION validate_bank_credit_reference();
DROP TRIGGER IF EXISTS cod_entries_credit_reference ON cod_entries;
CREATE TRIGGER cod_entries_credit_reference BEFORE INSERT ON cod_entries FOR EACH ROW EXECUTE FUNCTION validate_bank_credit_reference();

CREATE OR REPLACE FUNCTION validate_refund() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE receipt bank_receipts%ROWTYPE; target orders%ROWTYPE; claim return_cases%ROWTYPE;
  applied NUMERIC; previous NUMERIC; available NUMERIC; collected NUMERIC; source_time TIMESTAMPTZ;
BEGIN
  -- Same lock order as allocation: receipt, order, case. Never overwrite an earlier fact.
  IF NEW."receiptId" IS NOT NULL THEN
    SELECT * INTO receipt FROM bank_receipts WHERE id = NEW."receiptId" FOR UPDATE;
    source_time := receipt."receivedAt";
  END IF;
  IF NEW."orderId" IS NOT NULL THEN
    SELECT * INTO target FROM orders WHERE id = NEW."orderId" FOR UPDATE;
  END IF;
  IF NEW.source = 'receipt_excess' THEN
    SELECT coalesce(sum(amount), 0) INTO applied FROM payment_allocations WHERE "receiptId" = receipt.id;
    SELECT coalesce(sum(amount), 0) INTO previous FROM refunds WHERE "receiptId" = receipt.id AND source = 'receipt_excess';
    available := receipt.amount - applied - previous;
  ELSIF NEW.source = 'bank_order' THEN
    IF target."paymentMethod" <> 'bank_transfer' THEN RAISE EXCEPTION 'Wrong payment method' USING ERRCODE = '23514'; END IF;
    SELECT amount INTO applied FROM payment_allocations WHERE "receiptId" = receipt.id AND "orderId" = target.id;
    SELECT coalesce(sum(amount), 0) INTO previous FROM refunds WHERE "receiptId" = receipt.id AND source = 'bank_order';
    available := applied - previous;
  ELSE
    IF target."paymentMethod" <> 'cod' THEN RAISE EXCEPTION 'Wrong payment method' USING ERRCODE = '23514'; END IF;
    SELECT amount INTO collected FROM cod_entries WHERE "orderId" = target.id AND kind = 'collection';
    SELECT coalesce(sum(amount + fee), 0), max("occurredAt") INTO applied, source_time FROM cod_entries WHERE "orderId" = target.id AND kind = 'remittance';
    SELECT coalesce(sum(amount), 0) INTO previous FROM refunds WHERE "orderId" = target.id AND source = 'cod_order';
    available := least(coalesce(collected, 0), applied) - previous;
  END IF;
  IF available IS NULL OR NEW.amount > available OR NEW."occurredAt" > clock_timestamp() + INTERVAL '1 minute'
    OR (source_time IS NOT NULL AND NEW."occurredAt" + INTERVAL '1 second' < source_time) THEN
    RAISE EXCEPTION 'Refund exceeds verified available funds or invalid time' USING ERRCODE = '23514';
  END IF;
  IF NEW."caseId" IS NOT NULL THEN
    SELECT * INTO claim FROM return_cases WHERE id = NEW."caseId" FOR UPDATE;
    SELECT coalesce(sum(amount), 0) INTO previous FROM refunds WHERE "caseId" = claim.id;
    IF claim.id IS NULL OR claim."orderId" <> target.id OR claim.kind = 'exchange'
      OR (claim.kind = 'return_refund' AND claim.status <> 'received')
      OR (claim.kind = 'complaint' AND claim.status <> 'approved')
      OR NEW.amount + previous > claim."approvedAmount" THEN
      RAISE EXCEPTION 'Refund requires an eligible approved case' USING ERRCODE = '23514';
    END IF;
  ELSIF NEW."orderId" IS NOT NULL AND target.status <> 'cancelled' THEN
    RAISE EXCEPTION 'Fulfilled order refund requires a case' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS refunds_validate ON refunds;
CREATE TRIGGER refunds_validate BEFORE INSERT ON refunds FOR EACH ROW EXECUTE FUNCTION validate_refund();

-- Allocations must also respect money already returned from the unallocated receipt.
CREATE OR REPLACE FUNCTION validate_payment_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE receipt bank_receipts%ROWTYPE; target orders%ROWTYPE; applied NUMERIC; returned NUMERIC;
BEGIN
  SELECT * INTO receipt FROM bank_receipts WHERE id = NEW."receiptId" FOR UPDATE;
  SELECT * INTO target FROM orders WHERE id = NEW."orderId" FOR UPDATE;
  SELECT coalesce(sum(amount), 0) INTO applied FROM payment_allocations WHERE "orderId" = target.id;
  SELECT coalesce(sum(amount), 0) INTO returned FROM refunds WHERE "receiptId" = receipt.id;
  IF NEW."legacyVerification" THEN
    IF receipt.id IS NULL OR target.id IS NULL OR target."paymentMethod" <> 'bank_transfer'
      OR target."paymentStatus" <> 'paid' OR applied <> 0 OR target."expiredAt" IS NOT NULL
      OR NEW.amount <> target.total + coalesce(target."shippingFee", 0)
      OR NEW.amount > receipt.amount - returned
      OR receipt."receivedAt" + INTERVAL '1 second' < target."createdAt"
      OR EXISTS (SELECT 1 FROM refunds WHERE "orderId" = target.id) THEN
      RAISE EXCEPTION 'Invalid legacy payment verification' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF receipt.id IS NULL OR target.id IS NULL OR NEW.amount > receipt.amount - returned
    OR NEW.amount + applied > target.total + coalesce(target."shippingFee", 0)
    OR target."paymentMethod" <> 'bank_transfer' OR target."paymentStatus" <> 'unpaid'
    OR target.status IN ('cancelled', 'returned') OR target."expiredAt" IS NOT NULL
    OR EXISTS (SELECT 1 FROM refunds WHERE "orderId" = target.id)
    OR (target."paymentExpiresAt" IS NOT NULL AND target."paymentExpiresAt" <= clock_timestamp())
    OR receipt."receivedAt" + INTERVAL '1 second' < target."createdAt"
    OR (target."paymentExpiresAt" IS NOT NULL AND receipt."receivedAt" > target."paymentExpiresAt") THEN
    RAISE EXCEPTION 'Invalid payment allocation' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
-- Seller settlement facts are separate from operational revenue statistics.
CREATE TABLE IF NOT EXISTS settlement_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  "commissionBps" INTEGER NOT NULL CHECK ("commissionBps" BETWEEN 0 AND 10000),
  note VARCHAR(1000) NOT NULL CHECK (length(trim(note)) >= 10),
  "recordedBy" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS settlement_policies_shop ON settlement_policies("shopId", "createdAt" DESC, id);
CREATE TABLE IF NOT EXISTS seller_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  "orderId" UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  "policyId" UUID NOT NULL REFERENCES settlement_policies(id) ON DELETE RESTRICT,
  "refundId" UUID REFERENCES refunds(id) ON DELETE RESTRICT,
  "sourceKey" VARCHAR(180) NOT NULL,
  kind VARCHAR(30) NOT NULL CHECK (kind IN ('sale','commission','carrier_fee','refund','commission_refund','adjustment')),
  amount DECIMAL(15,0) NOT NULL CHECK (amount <> 0),
  "effectiveAt" TIMESTAMPTZ NOT NULL, "availableAt" TIMESTAMPTZ NOT NULL,
  note VARCHAR(1000) NOT NULL, evidence VARCHAR(1000), metadata JSONB NOT NULL DEFAULT '{}',
  "recordedBy" UUID REFERENCES users(id) ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((kind IN ('sale','commission_refund') AND amount > 0)
    OR (kind IN ('commission','carrier_fee','refund') AND amount < 0)
    OR (kind = 'adjustment' AND "recordedBy" IS NOT NULL AND evidence IS NOT NULL AND length(trim(evidence)) >= 5 AND length(trim(note)) >= 10)),
  CHECK ((kind IN ('refund','commission_refund')) = ("refundId" IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS seller_ledger_source_unique ON seller_ledger("sourceKey");
CREATE INDEX IF NOT EXISTS seller_ledger_shop ON seller_ledger("shopId", "createdAt" DESC, id);
CREATE INDEX IF NOT EXISTS seller_ledger_order ON seller_ledger("orderId");
CREATE TABLE IF NOT EXISTS settlement_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  "requestKey" VARCHAR(120) NOT NULL, "requestHash" VARCHAR(64) NOT NULL,
  "cutoffAt" TIMESTAMPTZ NOT NULL, amount DECIMAL(15,0) NOT NULL CHECK (amount > 0),
  note VARCHAR(1000) NOT NULL CHECK (length(trim(note)) >= 10),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','paid','cancelled')),
  "createdBy" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "closedBy" UUID REFERENCES users(id) ON DELETE RESTRICT,
  "closedAt" TIMESTAMPTZ, "closeNote" VARCHAR(1000),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((status = 'draft' AND "closedBy" IS NULL AND "closedAt" IS NULL)
    OR (status <> 'draft' AND "closedBy" IS NOT NULL AND "closedAt" IS NOT NULL AND length(trim("closeNote")) >= 10))
);
CREATE UNIQUE INDEX IF NOT EXISTS settlement_periods_request_unique ON settlement_periods("shopId", "requestKey");
CREATE UNIQUE INDEX IF NOT EXISTS settlement_periods_draft_unique ON settlement_periods("shopId") WHERE status = 'draft';
CREATE TABLE IF NOT EXISTS settlement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "periodId" UUID NOT NULL REFERENCES settlement_periods(id) ON DELETE RESTRICT,
  "entryId" UUID NOT NULL REFERENCES seller_ledger(id) ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS settlement_items_unique ON settlement_items("periodId", "entryId");
CREATE INDEX IF NOT EXISTS settlement_items_entry ON settlement_items("entryId");
CREATE TABLE IF NOT EXISTS seller_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "periodId" UUID NOT NULL REFERENCES settlement_periods(id) ON DELETE RESTRICT,
  "shopId" UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  amount DECIMAL(15,0) NOT NULL CHECK (amount > 0),
  reference VARCHAR(120) NOT NULL CHECK (reference = upper(trim(reference)) AND reference ~ '^[A-Z0-9][A-Z0-9._:/-]{2,119}$'),
  "occurredAt" TIMESTAMPTZ NOT NULL, beneficiary VARCHAR(200) NOT NULL CHECK (length(trim(beneficiary)) >= 5),
  evidence VARCHAR(1000) NOT NULL CHECK (length(trim(evidence)) >= 5),
  note VARCHAR(1000) NOT NULL CHECK (length(trim(note)) >= 10),
  "recordedBy" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS seller_payouts_period_unique ON seller_payouts("periodId");
CREATE UNIQUE INDEX IF NOT EXISTS seller_payouts_reference_unique ON seller_payouts(reference);

CREATE OR REPLACE FUNCTION validate_settlement_entry() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM orders WHERE id = NEW."orderId" AND "shopId" = NEW."shopId")
    OR NOT EXISTS (SELECT 1 FROM settlement_policies WHERE id = NEW."policyId" AND "shopId" = NEW."shopId")
    OR (NEW."refundId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM refunds WHERE id = NEW."refundId" AND "orderId" = NEW."orderId")) THEN
    RAISE EXCEPTION 'Settlement source does not belong to shop/order' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS seller_ledger_validate ON seller_ledger;
CREATE TRIGGER seller_ledger_validate BEFORE INSERT ON seller_ledger FOR EACH ROW EXECUTE FUNCTION validate_settlement_entry();

CREATE OR REPLACE FUNCTION validate_settlement_item() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p settlement_periods%ROWTYPE;
BEGIN
  SELECT * INTO p FROM settlement_periods WHERE id = NEW."periodId";
  PERFORM 1 FROM shops WHERE id = p."shopId" FOR NO KEY UPDATE;
  IF p.status <> 'draft' OR NOT EXISTS (SELECT 1 FROM seller_ledger WHERE id = NEW."entryId" AND "shopId" = p."shopId")
    OR EXISTS (SELECT 1 FROM settlement_items i JOIN settlement_periods other ON other.id = i."periodId"
      WHERE i."entryId" = NEW."entryId" AND other.status <> 'cancelled') THEN
    RAISE EXCEPTION 'Ledger entry already reserved or wrong shop' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS settlement_items_validate ON settlement_items;
CREATE TRIGGER settlement_items_validate BEFORE INSERT ON settlement_items FOR EACH ROW EXECUTE FUNCTION validate_settlement_item();

CREATE OR REPLACE FUNCTION validate_settlement_close() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'draft' OR NEW.status NOT IN ('paid','cancelled')
    OR (to_jsonb(NEW) - ARRAY['status','closedBy','closedAt','closeNote','updatedAt']) IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['status','closedBy','closedAt','closeNote','updatedAt'])
    OR (NEW.status = 'paid' AND NOT EXISTS (SELECT 1 FROM seller_payouts WHERE "periodId" = OLD.id))
    OR (NEW.status = 'cancelled' AND EXISTS (SELECT 1 FROM seller_payouts WHERE "periodId" = OLD.id)) THEN
    RAISE EXCEPTION 'Invalid settlement transition' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS settlement_periods_close ON settlement_periods;
CREATE TRIGGER settlement_periods_close BEFORE UPDATE ON settlement_periods FOR EACH ROW EXECUTE FUNCTION validate_settlement_close();
DROP TRIGGER IF EXISTS settlement_periods_immutable ON settlement_periods;
CREATE TRIGGER settlement_periods_immutable BEFORE DELETE ON settlement_periods FOR EACH ROW EXECUTE FUNCTION commercial_fact_immutable();

CREATE OR REPLACE FUNCTION validate_seller_payout() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p settlement_periods%ROWTYPE; item_total NUMERIC; balance NUMERIC;
BEGIN
  PERFORM 1 FROM shops WHERE id = NEW."shopId" FOR NO KEY UPDATE;
  SELECT * INTO p FROM settlement_periods WHERE id = NEW."periodId" FOR UPDATE;
  SELECT coalesce(sum(e.amount),0) INTO item_total FROM settlement_items i JOIN seller_ledger e ON e.id = i."entryId" WHERE i."periodId" = p.id;
  SELECT coalesce(sum(amount),0) - (SELECT coalesce(sum(amount),0) FROM seller_payouts WHERE "shopId" = NEW."shopId")
    INTO balance FROM seller_ledger WHERE "shopId" = NEW."shopId";
  IF p.id IS NULL OR p."shopId" <> NEW."shopId" OR p.status <> 'draft' OR NEW.amount <> p.amount OR NEW.amount <> item_total
    OR NEW.amount > balance OR NEW."occurredAt" > clock_timestamp() + INTERVAL '1 minute'
    OR NEW."occurredAt" + INTERVAL '1 second' < p."createdAt" THEN
    RAISE EXCEPTION 'Invalid seller payout or insufficient balance' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS seller_payouts_validate ON seller_payouts;
CREATE TRIGGER seller_payouts_validate BEFORE INSERT ON seller_payouts FOR EACH ROW EXECUTE FUNCTION validate_seller_payout();

CREATE OR REPLACE FUNCTION validate_bank_debit_reference() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.reference, 20261021));
  IF (TG_TABLE_NAME = 'refunds' AND EXISTS (SELECT 1 FROM seller_payouts WHERE reference = NEW.reference))
    OR (TG_TABLE_NAME = 'seller_payouts' AND EXISTS (SELECT 1 FROM refunds WHERE reference = NEW.reference)) THEN
    RAISE EXCEPTION 'Bank debit already recorded in another ledger' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS refunds_debit_reference ON refunds;
CREATE TRIGGER refunds_debit_reference BEFORE INSERT ON refunds FOR EACH ROW EXECUTE FUNCTION validate_bank_debit_reference();
DROP TRIGGER IF EXISTS seller_payouts_debit_reference ON seller_payouts;
CREATE TRIGGER seller_payouts_debit_reference BEFORE INSERT ON seller_payouts FOR EACH ROW EXECUTE FUNCTION validate_bank_debit_reference();
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['settlement_policies','seller_ledger','settlement_items','seller_payouts'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', t || '_immutable', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION commercial_fact_immutable()', t || '_immutable', t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_sold ON products(sold);
CREATE INDEX IF NOT EXISTS idx_products_craft_village_id ON products("craftVillageId");
CREATE INDEX IF NOT EXISTS idx_regions_featured_map ON regions("isFeatured", "mapY");
CREATE INDEX IF NOT EXISTS idx_craft_villages_region_id ON craft_villages("regionId");
CREATE INDEX IF NOT EXISTS idx_craft_villages_coordinates ON craft_villages(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_city
  ON orders ((lower("shippingAddress"->>'city')))
  WHERE "shippingAddress" ? 'city';
CREATE UNIQUE INDEX IF NOT EXISTS checkout_attempts_buyer_key_unique
  ON checkout_attempts("buyerId", "idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_order_unique
  ON payment_transactions("orderId");
-- Conflicting legacy defaults/reviews must be resolved explicitly before migration.
-- Index creation is transactional: failures preserve all existing records.
CREATE UNIQUE INDEX IF NOT EXISTS addresses_one_default_per_user
  ON addresses("userId") WHERE "isDefault" = true;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_order_product_user
  ON reviews("orderId", "productId", "userId");
CREATE INDEX IF NOT EXISTS payment_transactions_status_created_at
  ON payment_transactions(status, "createdAt" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS conversations_buyer_shop_unique
  ON conversations("buyerId", "shopId");
CREATE INDEX IF NOT EXISTS conversations_buyer_last_message
  ON conversations("buyerId", "lastMessageAt" DESC);
CREATE INDEX IF NOT EXISTS conversations_shop_last_message
  ON conversations("shopId", "lastMessageAt" DESC);
CREATE INDEX IF NOT EXISTS chat_messages_conversation_created_at
  ON chat_messages("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS chat_messages_unread
  ON chat_messages("conversationId", "senderId", "readAt")
  WHERE "readAt" IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_search_vector
  ON products
  USING GIN (
    to_tsvector(
      'simple',
      coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, '')
    )
  );
-- Account recovery, durable notifications and operational history (T6-T8).
ALTER TABLE users ADD COLUMN IF NOT EXISTS "requireSession" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS "moderationHidden" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "userId" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  "tokenHash" VARCHAR(64) NOT NULL, label VARCHAR(200) NOT NULL, "expiresAt" TIMESTAMPTZ NOT NULL,
  "lastSeenAt" TIMESTAMPTZ NOT NULL, "revokedAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_active ON auth_sessions("userId", "expiresAt") WHERE "revokedAt" IS NULL;
CREATE TABLE IF NOT EXISTS auth_action_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "userId" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  purpose VARCHAR(20) NOT NULL CHECK(purpose IN ('reset','verify')), "tokenHash" VARCHAR(64) NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL, "usedAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_action_tokens_user ON auth_action_tokens("userId", purpose);
CREATE TABLE IF NOT EXISTS auth_rate_limits (key VARCHAR(64) PRIMARY KEY, count INTEGER NOT NULL, "expiresAt" TIMESTAMPTZ NOT NULL);
CREATE INDEX IF NOT EXISTS auth_rate_expiry ON auth_rate_limits("expiresAt");
CREATE TABLE IF NOT EXISTS notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "userId" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  title VARCHAR(200) NOT NULL, body VARCHAR(2000) NOT NULL, href VARCHAR(250) NOT NULL, payload TEXT, "readAt" TIMESTAMPTZ,
  state VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sent','failed','expired')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5), "nextAttemptAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "sentAt" TIMESTAMPTZ, "lastError" VARCHAR(40), "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_outbox_due ON notification_outbox("nextAttemptAt", id) WHERE state = 'pending';
CREATE INDEX IF NOT EXISTS notification_outbox_user ON notification_outbox("userId", "createdAt" DESC, id DESC);
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "requesterId" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  "orderId" UUID REFERENCES orders(id) ON DELETE RESTRICT ON UPDATE CASCADE, subject VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed')),
  "assignedTo" UUID REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_tickets_requester ON support_tickets("requesterId", "createdAt" DESC, id DESC);
CREATE INDEX IF NOT EXISTS support_tickets_queue ON support_tickets(status, "assignedTo", "createdAt" DESC, id DESC);
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "ticketId" UUID NOT NULL REFERENCES support_tickets(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  "authorId" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE, body VARCHAR(2000) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_messages_ticket ON support_messages("ticketId", "createdAt", id);
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "actorId" UUID REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  action VARCHAR(80) NOT NULL, "resourceType" VARCHAR(60) NOT NULL, "resourceId" UUID NOT NULL,
  details JSONB NOT NULL DEFAULT '{}', "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_resource ON audit_events("resourceType", "resourceId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS audit_events_created ON audit_events("createdAt" DESC, id DESC);
CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "actorId" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  "resourceType" VARCHAR(20) NOT NULL CHECK("resourceType" IN ('shop','product','review')), "resourceId" UUID NOT NULL,
  action VARCHAR(20) NOT NULL CHECK(action IN ('approve','hide')), reason VARCHAR(1000) NOT NULL CHECK(length(trim(reason)) >= 5),
  previous VARCHAR(30) NOT NULL, next VARCHAR(30) NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS "moderationHidden" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS orders_buyer_page ON orders("buyerId", "createdAt" DESC, id DESC);
CREATE INDEX IF NOT EXISTS orders_shop_page ON orders("shopId", "createdAt" DESC, id DESC);
CREATE INDEX IF NOT EXISTS orders_buyer_status_page ON orders("buyerId", status, "createdAt" DESC, id DESC);
CREATE INDEX IF NOT EXISTS orders_shop_status_page ON orders("shopId", status, "createdAt" DESC, id DESC);

CREATE OR REPLACE FUNCTION operations_order_notification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notification_outbox("userId",title,body,href) VALUES
      (NEW."buyerId", 'Đơn hàng đã được tạo', 'Đơn #' || left(NEW.id::text,8) || ' đã được tạo.', '/orders/' || NEW.id);
  ELSIF OLD.status IS DISTINCT FROM NEW.status OR OLD."paymentStatus" IS DISTINCT FROM NEW."paymentStatus" THEN
    INSERT INTO notification_outbox("userId",title,body,href) VALUES
      (NEW."buyerId", 'Cập nhật đơn hàng', 'Đơn #' || left(NEW.id::text,8) || ': ' || NEW.status || ', thanh toán: ' || NEW."paymentStatus", '/orders/' || NEW.id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS orders_notify ON orders;
CREATE TRIGGER orders_notify AFTER INSERT OR UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION operations_order_notification();

CREATE OR REPLACE FUNCTION operations_financial_audit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE data JSONB := to_jsonb(NEW); actor UUID; fields JSONB;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  END IF;
  actor := COALESCE(data->>'recordedBy', data->>'allocatedBy', data->>'closedBy', data->>'createdBy', data->>'actorId')::UUID;
  fields := jsonb_strip_nulls(jsonb_build_object('orderId',data->'orderId','shopId',data->'shopId',
    'periodId',data->'periodId','receiptId',data->'receiptId','amount',data->'amount','status',data->'status',
    'kind',data->'kind','resourceType',data->'resourceType','resourceId',data->'resourceId',
    'reason',data->'reason','previous',data->'previous','next',data->'next'));
  INSERT INTO audit_events("actorId",action,"resourceType","resourceId",details)
    VALUES(actor,lower(TG_OP),TG_TABLE_NAME,NEW.id,fields);
  RETURN NEW;
END $$;
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['bank_receipts','payment_allocations','refunds','cod_entries','settlement_policies','seller_ledger','seller_payouts','moderation_actions'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', t || '_audit', t);
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT ON %I FOR EACH ROW EXECUTE FUNCTION operations_financial_audit()', t || '_audit', t);
  END LOOP;
END $$;
DROP TRIGGER IF EXISTS settlement_periods_audit ON settlement_periods;
CREATE TRIGGER settlement_periods_audit AFTER INSERT OR UPDATE ON settlement_periods FOR EACH ROW EXECUTE FUNCTION operations_financial_audit();
DROP TRIGGER IF EXISTS audit_events_immutable ON audit_events;
CREATE TRIGGER audit_events_immutable BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION commercial_fact_immutable();
DROP TRIGGER IF EXISTS moderation_actions_immutable ON moderation_actions;
CREATE TRIGGER moderation_actions_immutable BEFORE UPDATE OR DELETE ON moderation_actions FOR EACH ROW EXECUTE FUNCTION commercial_fact_immutable();
DROP TRIGGER IF EXISTS support_messages_immutable ON support_messages;
CREATE TRIGGER support_messages_immutable BEFORE UPDATE OR DELETE ON support_messages FOR EACH ROW EXECUTE FUNCTION commercial_fact_immutable();

CREATE OR REPLACE FUNCTION operations_shop_notification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notification_outbox("userId",title,body,href) VALUES(NEW."ownerId",'Đăng ký gian hàng','Gian hàng của bạn đang chờ duyệt.','/seller/settings');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS shops_notify ON shops;
CREATE TRIGGER shops_notify AFTER INSERT ON shops FOR EACH ROW EXECUTE FUNCTION operations_shop_notification();

-- T9: stock revisions cover every writer, including checkout, cancellation and returns.
ALTER TABLE products ADD COLUMN IF NOT EXISTS "stockVersion" INTEGER NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION product_stock_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."stockVersion" := OLD."stockVersion" + CASE WHEN NEW.stock IS DISTINCT FROM OLD.stock THEN 1 ELSE 0 END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS products_stock_revision ON products;
CREATE TRIGGER products_stock_revision BEFORE UPDATE OF stock, "stockVersion" ON products
  FOR EACH ROW EXECUTE FUNCTION product_stock_revision();

CREATE TABLE IF NOT EXISTS product_stock_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "recordedBy" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  "requestKey" VARCHAR(120) NOT NULL,
  "fromVersion" INTEGER NOT NULL CHECK ("fromVersion" >= 0),
  "toVersion" INTEGER NOT NULL CHECK ("toVersion" >= "fromVersion"),
  "stockBefore" INTEGER NOT NULL CHECK ("stockBefore" BETWEEN 0 AND 1000000000),
  "stockAfter" INTEGER NOT NULL CHECK ("stockAfter" BETWEEN 0 AND 1000000000),
  reason VARCHAR(1000) NOT NULL CHECK (length(trim(reason)) >= 5),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS product_stock_updates_request_unique ON product_stock_updates("productId", "requestKey");
DROP TRIGGER IF EXISTS product_stock_updates_immutable ON product_stock_updates;
CREATE TRIGGER product_stock_updates_immutable BEFORE UPDATE ON product_stock_updates
  FOR EACH ROW EXECUTE FUNCTION commercial_fact_immutable();

-- T12-14: one warehouse per shop. stock=available; held=reserved but not shipped.
ALTER TABLE products ADD COLUMN IF NOT EXISTS "variantCount" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "shopId" UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  sku VARCHAR(100) NOT NULL, name VARCHAR(200) NOT NULL DEFAULT 'Mặc định',
  color VARCHAR(100), size VARCHAR(100), material VARCHAR(100), image TEXT,
  price NUMERIC(15,0) NOT NULL CHECK(price BETWEEN 0 AND 999999999999999),
  "salePrice" NUMERIC(15,0) CHECK("salePrice" >= 0 AND "salePrice" <= price),
  stock INTEGER NOT NULL DEFAULT 0 CHECK(stock BETWEEN 0 AND 1000000000),
  held INTEGER NOT NULL DEFAULT 0 CHECK(held BETWEEN 0 AND 1000000000),
  "stockVersion" INTEGER NOT NULL DEFAULT 0 CHECK("stockVersion">=0),
  "lowStockThreshold" INTEGER NOT NULL DEFAULT 5 CHECK("lowStockThreshold" BETWEEN 0 AND 1000000000),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS variants_shop_sku ON product_variants("shopId",lower(sku));
CREATE INDEX IF NOT EXISTS variants_product ON product_variants("productId",id);
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "variantId" UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  "shopId" UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  "orderId" UUID REFERENCES orders(id) ON DELETE RESTRICT,
  "actorId" UUID REFERENCES users(id) ON DELETE RESTRICT,
  kind VARCHAR(30) NOT NULL CHECK(kind IN ('opening','receipt','adjustment','reserve','release','ship','return','exchange','legacy_adjustment')),
  "sourceKey" VARCHAR(180) NOT NULL,
  "requestHash" VARCHAR(64),
  "availableDelta" INTEGER NOT NULL, "heldDelta" INTEGER NOT NULL,
  "availableAfter" INTEGER NOT NULL CHECK("availableAfter">=0), "heldAfter" INTEGER NOT NULL CHECK("heldAfter">=0),
  reason VARCHAR(1000) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("variantId","sourceKey")
);
CREATE INDEX IF NOT EXISTS inventory_shop_date ON inventory_movements("shopId","createdAt" DESC,id);
CREATE INDEX IF NOT EXISTS inventory_sku_date ON inventory_movements("variantId","createdAt" DESC,id);
CREATE INDEX IF NOT EXISTS products_shop_page ON products("shopId","createdAt" DESC,id);
CREATE INDEX IF NOT EXISTS products_shop_active_page ON products("shopId","isActive","createdAt" DESC,id);

-- New columns only: existing order amounts, names and quantities are untouched.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS "variantId" UUID REFERENCES product_variants(id) ON DELETE RESTRICT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS "variantName" VARCHAR(200);
INSERT INTO product_variants(id,"productId","shopId",sku,name,price,"salePrice",image,stock,held)
SELECT p.id,p.id,p."shopId",'DEFAULT-'||p.id,'Mặc định',p.price,p."salePrice",p.images[1],p.stock,
  coalesce((SELECT sum(i.quantity) FROM order_items i JOIN orders o ON o.id=i."orderId"
    WHERE i."productId"=p.id AND o.status IN ('pending','confirmed','packing')),0)
FROM products p WHERE NOT EXISTS(SELECT 1 FROM product_variants v WHERE v."productId"=p.id);
INSERT INTO inventory_movements("variantId","shopId",kind,"sourceKey","availableDelta","heldDelta","availableAfter","heldAfter",reason)
SELECT id,"shopId",'opening','opening',stock,held,stock,held,'Tồn đầu kỳ tại mốc chuyển đổi SKU; không phải lịch sử nhập hàng trước đây'
FROM product_variants v WHERE NOT EXISTS(SELECT 1 FROM inventory_movements m WHERE m."variantId"=v.id);
UPDATE order_items i SET "variantId"=p.id,sku='DEFAULT-'||p.id,"variantName"='Mặc định (đơn cũ, chưa có lựa chọn biến thể)'
FROM products p WHERE i."productId"=p.id AND i."variantId" IS NULL;
ALTER TABLE order_items ALTER COLUMN "variantId" SET NOT NULL;

CREATE OR REPLACE FUNCTION inventory_variant_sync() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE best product_variants; BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO inventory_movements("variantId","shopId",kind,"sourceKey","availableDelta","heldDelta","availableAfter","heldAfter",reason)
    VALUES(NEW.id,NEW."shopId",'opening','opening',NEW.stock,NEW.held,NEW.stock,NEW.held,'Tồn đầu kỳ khi tạo SKU');
  END IF;
  IF pg_trigger_depth()=1 THEN
    SELECT * INTO best FROM product_variants WHERE "productId"=NEW."productId" AND "isActive" ORDER BY coalesce("salePrice",price),id LIMIT 1;
    UPDATE products SET stock=(SELECT coalesce(sum(stock) FILTER (WHERE "isActive"),0) FROM product_variants WHERE "productId"=NEW."productId"),
      "variantCount"=(SELECT count(*) FROM product_variants WHERE "productId"=NEW."productId" AND "isActive"),
      price=coalesce(best.price,price),"salePrice"=CASE WHEN best.id IS NULL THEN "salePrice" ELSE best."salePrice" END
      WHERE id=NEW."productId";
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION inventory_variant_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."productId"<>OLD."productId" OR NEW."shopId"<>OLD."shopId" THEN RAISE EXCEPTION 'SKU ownership is immutable'; END IF;
  NEW."stockVersion":=OLD."stockVersion"+CASE WHEN (NEW.stock,NEW.held) IS DISTINCT FROM (OLD.stock,OLD.held) THEN 1 ELSE 0 END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS variants_revision ON product_variants;
CREATE TRIGGER variants_revision BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION inventory_variant_revision();
DROP TRIGGER IF EXISTS variants_sync ON product_variants;
CREATE TRIGGER variants_sync AFTER INSERT OR UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION inventory_variant_sync();

-- Compatibility with existing import/seed scripts. Normal stock writes use the
-- inventory service and carry a human actor and business source.
CREATE OR REPLACE FUNCTION inventory_product_compat() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v product_variants; BEGIN
  IF pg_trigger_depth()>1 THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' THEN
    INSERT INTO product_variants(id,"productId","shopId",sku,name,price,"salePrice",image,stock)
    VALUES(NEW.id,NEW.id,NEW."shopId",'DEFAULT-'||NEW.id,'Mặc định',NEW.price,NEW."salePrice",NEW.images[1],NEW.stock);
  ELSE
    SELECT * INTO v FROM product_variants WHERE id=NEW.id FOR UPDATE;
    IF v.id IS NOT NULL AND (SELECT count(*) FROM product_variants WHERE "productId"=NEW.id)=1 THEN
      UPDATE product_variants SET stock=NEW.stock,price=NEW.price,"salePrice"=NEW."salePrice",image=NEW.images[1] WHERE id=v.id;
      IF NEW.stock<>OLD.stock THEN
        INSERT INTO inventory_movements("variantId","shopId",kind,"sourceKey","availableDelta","heldDelta","availableAfter","heldAfter",reason)
        VALUES(v.id,v."shopId",'legacy_adjustment',gen_random_uuid()::text,NEW.stock-OLD.stock,0,NEW.stock,v.held,'Điều chỉnh qua bộ nhập sản phẩm tương thích; tác nhân hệ thống');
      END IF;
    ELSIF NEW.stock<>OLD.stock OR NEW.price<>OLD.price OR NEW."salePrice" IS DISTINCT FROM OLD."salePrice" THEN
      RAISE EXCEPTION 'Use SKU inventory and price editor';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS products_inventory_compat ON products;
CREATE TRIGGER products_inventory_compat AFTER INSERT OR UPDATE OF stock,price,"salePrice",images ON products
  FOR EACH ROW EXECUTE FUNCTION inventory_product_compat();
CREATE OR REPLACE FUNCTION inventory_item_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v product_variants; BEGIN
  SELECT * INTO v FROM product_variants WHERE id=coalesce(NEW."variantId",NEW."productId");
  IF v.id IS NULL OR v."productId"<>NEW."productId" THEN RAISE EXCEPTION 'Variant does not belong to product'; END IF;
  NEW."variantId":=v.id; NEW.sku:=coalesce(NEW.sku,v.sku); NEW."variantName":=coalesce(NEW."variantName",v.name);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS order_items_variant ON order_items;
CREATE TRIGGER order_items_variant BEFORE INSERT ON order_items FOR EACH ROW EXECUTE FUNCTION inventory_item_snapshot();
DROP TRIGGER IF EXISTS inventory_immutable ON inventory_movements;
CREATE TRIGGER inventory_immutable BEFORE UPDATE ON inventory_movements FOR EACH ROW EXECUTE FUNCTION commercial_fact_immutable();
