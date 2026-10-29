import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';
import { OptionalAuthGuard } from '../../common/guards/auth.guard';

import { ProductsService } from './products.service';

@Controller('api/products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get('')
  listProducts(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.listProducts(request, response);
  }

  @Get('search')
  searchProducts(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.searchProducts(request, response);
  }

  @Get('recommendations')
  @UseGuards(OptionalAuthGuard)
  getRecommendations(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.getRecommendations(request, response);
  }

  @Get(':id')
  getProductById(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.getProductById(request, response);
  }
}
