import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';

const { checkDatabase, databaseFailure } = require('../../database/check');

@Controller('health')
export class HealthController {
  @Get()
  async health(@Res() response: Response) {
    response.set('Cache-Control', 'no-store');
    try {
      response.json(await checkDatabase());
    } catch (error) {
      response.status(503).json(databaseFailure(error));
    }
  }
}
