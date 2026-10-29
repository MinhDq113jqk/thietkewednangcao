import { HttpCode, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';

import { ShippingService } from './shipping.service';

@Controller('api/shipping')
export class ShippingController {
  constructor(private readonly service: ShippingService) {}

  @Get('estimate')
  estimate(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.estimate(request, response);
  }

  @Post('estimate')
  @HttpCode(200)
  estimateByOrderId(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.estimate(request, response);
  }
}
