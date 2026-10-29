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

import { ConversationsService } from './conversations.service';

@Controller('api/conversations')
@UseGuards(AuthGuard)
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Post('')
  @HttpCode(200)
  startConversation(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.startConversation(request, response);
  }

  @Get('')
  listConversations(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.listConversations(request, response);
  }

  @Get(':id/messages')
  listMessages(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.listMessages(request, response);
  }

  @Post(':id/messages')
  @HttpCode(200)
  sendMessage(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.sendMessage(request, response);
  }

  @Put(':id/read')
  markConversationRead(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.markConversationRead(request, response);
  }
}
