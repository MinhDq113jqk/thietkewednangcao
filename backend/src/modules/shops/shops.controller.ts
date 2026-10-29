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
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ShopsService } from './shops.service';

@Controller('api/shops')
export class ShopsController {
  constructor(private readonly service: ShopsService) {}

  @Post('register')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  registerShop(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.registerShop(request, response);
  }

  @Get('me')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  getMyShop(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.getMyShop(request, response);
  }

  @Put('me')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  updateMyShop(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.updateMyShop(request, response);
  }

  @Get(':slug/products')
  getShopProducts(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.getShopProducts(request, response);
  }

  @Get(':slug')
  getShopBySlug(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.getShopBySlug(request, response);
  }
}
