import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { SellerOrdersController } from './seller-orders.controller';

@Module({
  controllers: [OrdersController, SellerOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
