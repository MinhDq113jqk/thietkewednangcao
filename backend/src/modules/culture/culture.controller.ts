import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';

import { CultureService } from './culture.service';

@Controller('api/culture')
export class CultureController {
  constructor(private readonly service: CultureService) {}

  @Get('regions')
  listRegions(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.listRegions(request, response);
  }

  @Get('regions/:slug')
  getRegion(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.getRegion(request, response);
  }

  @Get('products')
  listCultureProducts(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.listCultureProducts(request, response);
  }
}
