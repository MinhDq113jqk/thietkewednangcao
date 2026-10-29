import { HttpCode, Controller, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';

import { AssistantService } from './assistant.service';

@Controller('api/assistant')
export class AssistantController {
  constructor(private readonly service: AssistantService) {}

  @Post('chat')
  @HttpCode(200)
  chat(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.chat(request, response);
  }
}
