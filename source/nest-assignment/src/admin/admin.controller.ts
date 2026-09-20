import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/types/jwt-payload';

type AuthenticatedRequest = Request & {
  user: JwtPayload;
};

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Get('profile')
  @Roles(UserRole.ADMIN)
  profile(@Req() request: AuthenticatedRequest) {
    return {
      message: 'Bạn đã vượt qua JWT Guard và Role Guard',
      user: request.user,
      note: 'Đây là endpoint minh họa cho bài tập, không phải màn quản trị của SouvenirShop.',
    };
  }
}
