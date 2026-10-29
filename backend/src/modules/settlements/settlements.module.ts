import { Module } from '@nestjs/common';
import { AdminSettlementsController, SellerSettlementsController } from './settlements.controller';
@Module({ controllers: [AdminSettlementsController, SellerSettlementsController] })
export class SettlementsModule {}
