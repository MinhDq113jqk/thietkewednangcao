require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối database thành công');

    await sequelize.query(`
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

      DO $constraints$
      BEGIN
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
      CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products("shopId");
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
    `);

    console.log('✅ Migration hoàn thành — tất cả bảng đã được tạo');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration thất bại:', err.message);
    process.exit(1);
  }
})();
