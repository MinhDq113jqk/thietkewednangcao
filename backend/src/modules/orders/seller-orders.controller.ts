import { Controller, Get, Put, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrdersService } from './orders.service';

@Controller('api/seller/orders')
@UseGuards(AuthGuard, RolesGuard)
@Roles('seller', 'admin')
export class SellerOrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get('')
  listSellerOrders(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.listSellerOrders(request, response);
  }

  @Get('stats')
  getSellerOrderStats(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.getSellerOrderStats(request, response);
  }

  @Put(':id/confirm')
  confirmSellerOrder(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.confirmSellerOrder(request, response);
  }

  @Put(':id/pack')
  packSellerOrder(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.packSellerOrder(request, response);
  }

  @Put(':id/ship')
  shipSellerOrder(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.shipSellerOrder(request, response);
  }

  @Put(':id/tracking')
  updateSellerTracking(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.updateSellerTracking(request, response);
  }

  @Put(':id/deliver')
  deliverSellerOrder(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.deliverSellerOrder(request, response);
  }
}
