import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { SecurityModule } from './common/security.module';
import { HealthController } from './modules/health/health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ShopsModule } from './modules/shops/shops.module';
import { AdminModule } from './modules/admin/admin.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { CultureModule } from './modules/culture/culture.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AfterSalesModule } from './modules/after-sales/after-sales.module';
import { SettlementsModule } from './modules/settlements/settlements.module';
import { OperationsModule } from './modules/operations/operations.module';

@Module({
  imports: [
    DatabaseModule,
    SecurityModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    OrdersModule,
    ShopsModule,
    AdminModule,
    AssistantModule,
    ConversationsModule,
    CultureModule,
    PaymentModule,
    ShippingModule,
    UploadsModule,
    ReviewsModule,
    AfterSalesModule,
    SettlementsModule,
    OperationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
