import {
  HttpCode,
  Controller,
  Get,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';
import { AuthGuard } from '../../common/guards/auth.guard';

import { OrdersService } from './orders.service';

@Controller('api/orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post('')
  @HttpCode(200)
  createOrder(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.createOrder(request, response);
  }

  @Get('')
  listMyOrders(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.listMyOrders(request, response);
  }

  @Get(':id')
  getMyOrderById(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.getMyOrderById(request, response);
  }

  @Put(':id/cancel')
  cancelMyOrder(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.cancelMyOrder(request, response);
  }
}
