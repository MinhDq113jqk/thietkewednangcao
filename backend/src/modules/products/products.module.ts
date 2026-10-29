import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { SellerProductsController } from './seller-products.controller';
import { productProviders } from './products.providers';

@Module({
  controllers: [ProductsController, SellerProductsController],
  providers: [ProductsService, ...productProviders],
})
export class ProductsModule {}
