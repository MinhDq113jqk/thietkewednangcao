import { Controller, Get, Put, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';

@Controller('api/admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('stats')
  getStats(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.getStats(request, response);
  }

  @Get('shops')
  listShops(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.listShops(request, response);
  }

  @Put('shops/:id/approve')
  approveShop(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.approveShop(request, response);
  }

  @Put('shops/:id/suspend')
  suspendShop(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.suspendShop(request, response);
  }

  @Get('users')
  listUsers(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.listUsers(request, response);
  }

  @Put('users/:id/status')
  updateUserStatus(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.updateUserStatus(request, response);
  }

  @Get('orders')
  listOrders(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.listOrders(request, response);
  }

  @Put('orders/:id/status')
  updateOrderStatus(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.updateOrderStatus(request, response);
  }

  @Put('orders/:id/payment')
  updateOrderPayment(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.updateOrderPayment(request, response);
  }
}
