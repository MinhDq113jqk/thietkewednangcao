import { Module } from '@nestjs/common';
import { AfterSalesController, SellerAfterSalesController, AdminAfterSalesController } from './after-sales.controller';

@Module({ controllers: [AfterSalesController, SellerAfterSalesController, AdminAfterSalesController] })
export class AfterSalesModule {}
