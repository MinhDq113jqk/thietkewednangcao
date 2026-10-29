import {
  HttpCode,
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';
import { AuthGuard } from '../../common/guards/auth.guard';

import { PaymentService } from './payment.service';

@Controller('api/payment')
@UseGuards(AuthGuard)
export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  @Post('vietqr')
  @HttpCode(200)
  generateOrderQr(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.generateOrderQr(request, response);
  }

  @Post('vietqr/:orderId')
  @HttpCode(200)
  generateOrderQrByOrderId(
    @Req() request: AppRequest,
    @Res() response: Response,
  ) {
    return this.service.generateOrderQr(request, response);
  }
}
