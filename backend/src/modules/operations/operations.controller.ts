import { Controller, Get, Post, Patch, Req, Body, Param, Query, UseGuards } from '@nestjs/common';
import type { AppRequest } from '../../common/types/app-request';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
const service = require('../../services/operations.service');

@Controller('api/support')
@UseGuards(AuthGuard)
export class SupportController {
  @Get('')
  list(@Req() req: AppRequest, @Query() query) { return service.listTickets(req.user.id, false, query); }
  @Post('')
  create(@Req() req: AppRequest, @Body() body) { return service.createTicket(req.user.id, body); }
  @Get(':id')
  detail(@Req() req: AppRequest, @Param('id') id, @Query() query) { return service.getTicket(req.user.id, false, id, query); }
  @Post(':id/messages')
  reply(@Req() req: AppRequest, @Param('id') id, @Body() body) { return service.reply(req.user.id, false, id, body); }
}
@Controller('api/notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  @Get('')
  list(@Req() req: AppRequest, @Query() query) { return service.listNotifications(req.user.id, query); }
  @Patch(':id/read')
  async read(@Req() req: AppRequest, @Param('id') id) { await service.readNotification(req.user.id, id); return { message: 'Đã đọc thông báo' }; }
}
@Controller('api/admin/operations')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class OperationsAdminController {
  @Get('support')
  tickets(@Req() req: AppRequest, @Query() query) { return service.listTickets(req.user.id, true, query); }
  @Get('support/:id')
  ticket(@Req() req: AppRequest, @Param('id') id, @Query() query) { return service.getTicket(req.user.id, true, id, query); }
  @Patch('support/:id')
  update(@Req() req: AppRequest, @Param('id') id, @Body() body) { return service.updateTicket(req.user.id, id, body); }
  @Post('support/:id/messages')
  reply(@Req() req: AppRequest, @Param('id') id, @Body() body) { return service.reply(req.user.id, true, id, body); }
  @Get('notifications')
  notifications(@Req() req: AppRequest, @Query() query) { return service.listNotifications(req.user.id, query, true); }
  @Post('notifications/:id/retry')
  async retry(@Req() req: AppRequest, @Param('id') id) { await service.retryNotification(req.user.id, id); return { message: 'Đã đưa vào hàng chờ' }; }
  @Get('audit')
  audit(@Query() query) { return service.listAudit(query); }
  @Get('moderation')
  moderation(@Query() query) { return service.listModeration(query); }
  @Get('content/:type')
  content(@Param('type') type, @Query() query) { return service.listContent(type, query); }
  @Post('content/:type/:id/moderate')
  moderate(@Req() req: AppRequest, @Param('type') type, @Param('id') id, @Body() body) { return service.moderate(req.user.id, type, id, body); }
}
