import { Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

const { Order } = require('../../models');
const { listBankReceipts, recordBankReceipt, allocateBankReceipt, orderPaymentSummary, getBankReceipt } = require('../../services/paymentReconciliation.service');
const { expireUnpaidOrders } = require('../../services/paymentExpiry.service');

@Controller('api/admin/payments')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class PaymentAdminController {
  @Get('receipts')
  async list(@Req() req: AppRequest, @Res() res: Response) {
    return res.json(await listBankReceipts(req.query));
  }

  @Post('receipts')
  async record(@Req() req: AppRequest, @Res() res: Response) {
    const result = await recordBankReceipt(req.body, req.user.id);
    return res.status(result.idempotentReplay ? 200 : 201).json(result);
  }

  @Get('receipts/:id')
  async receipt(@Req() req: AppRequest, @Res() res: Response) {
    return res.json(await getBankReceipt(req.params.id));
  }

  @Post('receipts/:id/allocate')
  @HttpCode(200)
  async allocate(@Req() req: AppRequest, @Res() res: Response) {
    return res.json(await allocateBankReceipt(req.params.id, req.body, req.user.id));
  }

  @Get('orders/:id')
  async order(@Req() req: AppRequest, @Res() res: Response) {
    if (typeof req.params.id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(req.params.id)) return res.status(400).json({ message: 'Mã đơn không hợp lệ' });
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    return res.json({ id: order.id, status: order.status, paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod, paymentExpiresAt: order.paymentExpiresAt, expiredAt: order.expiredAt,
      ...await orderPaymentSummary(order) });
  }

  @Post('expire')
  @HttpCode(200)
  async expire(@Res() res: Response) {
    return res.json({ expired: await expireUnpaidOrders() });
  }
}
