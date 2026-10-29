import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
const service = require('../../services/settlement.service');

@Controller('api/seller/settlements')
@UseGuards(AuthGuard, RolesGuard)
@Roles('seller')
export class SellerSettlementsController {
  @Get('')
  async statement(@Req() req: AppRequest, @Res() res: Response) {
    return res.json(await service.readStatement(null, req.query, req.user));
  }
  @Get('periods/:id')
  async period(@Req() req: AppRequest, @Res() res: Response) {
    return res.json(await service.readPeriod(req.params.id, req.query, req.user));
  }
}

@Controller('api/admin/settlements')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminSettlementsController {
  @Get('shops')
  async shops(@Req() req: AppRequest, @Res() res: Response) { return res.json(await service.listShops(req.query)); }
  @Get('shops/:id')
  async statement(@Req() req: AppRequest, @Res() res: Response) { return res.json(await service.readStatement(req.params.id, req.query, req.user)); }
  @Get('periods/:id')
  async period(@Req() req: AppRequest, @Res() res: Response) { return res.json(await service.readPeriod(req.params.id, req.query, req.user)); }
  @Post('shops/:id/policy')
  async policy(@Req() req: AppRequest, @Res() res: Response) {
    const result = await service.savePolicy(req.params.id, req.body, req.user);
    return res.status(result.idempotentReplay ? 200 : 201).json(result);
  }
  @Post('shops/:id/sync')
  async sync(@Req() req: AppRequest, @Res() res: Response) { return res.status(200).json(await service.synchronize(req.params.id, req.user)); }
  @Post('shops/:id/periods')
  async create(@Req() req: AppRequest, @Res() res: Response) {
    const result = await service.createPeriod(req.params.id, req.body, req.user);
    return res.status(result.idempotentReplay ? 200 : 201).json(result);
  }
  @Post('shops/:id/adjustments')
  async adjustment(@Req() req: AppRequest, @Res() res: Response) {
    const result = await service.recordAdjustment(req.params.id, req.body, req.user);
    return res.status(result.idempotentReplay ? 200 : 201).json(result);
  }
  @Post('periods/:id/cancel')
  async cancel(@Req() req: AppRequest, @Res() res: Response) { return res.status(200).json(await service.cancelPeriod(req.params.id, req.body, req.user)); }
  @Post('periods/:id/payout')
  async payout(@Req() req: AppRequest, @Res() res: Response) {
    const result = await service.recordPayout(req.params.id, req.body, req.user);
    return res.status(result.idempotentReplay ? 200 : 201).json(result);
  }
}
