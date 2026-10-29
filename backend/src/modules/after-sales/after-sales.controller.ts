import { Controller, Get, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
const { createCase, listCases, transitionCase, recordRefund } = require('../../services/afterSales.service');
const { listCodOrders, recordCodEntry, getOrderFinance } = require('../../services/codReconciliation.service');

@Controller('api/after-sales')
@UseGuards(AuthGuard)
export class AfterSalesController {
  @Get('')
  async list(@Req() req: AppRequest, @Res() res: Response) {
    return res.json(await listCases(req.query, req.user, 'buyer'));
  }
  @Post('orders/:id')
  async create(@Req() req: AppRequest, @Res() res: Response) {
    const result = await createCase(req.params.id, req.body, req.user);
    return res.status(result.idempotentReplay ? 200 : 201).json(result);
  }
}

@Controller('api/seller/after-sales')
@UseGuards(AuthGuard, RolesGuard)
@Roles('seller', 'admin')
export class SellerAfterSalesController {
  @Get('')
  async list(@Req() req: AppRequest, @Res() res: Response) {
    return res.json(await listCases(req.query, req.user, 'seller'));
  }
  @Put(':id')
  async update(@Req() req: AppRequest, @Res() res: Response) {
    return res.json(await transitionCase(req.params.id, req.body, req.user));
  }
  @Get('cod')
  async cod(@Req() req: AppRequest, @Res() res: Response) {
    return res.json(await listCodOrders(req.query, req.user, true));
  }
}

@Controller('api/admin/after-sales')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminAfterSalesController {
  @Get('')
  async list(@Req() req: AppRequest, @Res() res: Response) {
    return res.json(await listCases(req.query, req.user, 'admin'));
  }
  @Put(':id')
  async update(@Req() req: AppRequest, @Res() res: Response) {
    return res.json(await transitionCase(req.params.id, req.body, req.user));
  }
  @Get('cod')
  async cod(@Req() req: AppRequest, @Res() res: Response) {
    return res.json(await listCodOrders(req.query, req.user));
  }
  @Post('cod/:id')
  async recordCod(@Req() req: AppRequest, @Res() res: Response) {
    const result = await recordCodEntry(req.params.id, req.body, req.user.id);
    return res.status(result.idempotentReplay ? 200 : 201).json(result);
  }
  @Get('finance/:id')
  async finance(@Req() req: AppRequest, @Res() res: Response) {
    return res.json(await getOrderFinance(req.params.id));
  }
  @Post('refunds')
  async refund(@Req() req: AppRequest, @Res() res: Response) {
    const result = await recordRefund(req.body, req.user.id);
    return res.status(result.idempotentReplay ? 200 : 201).json(result);
  }
}
