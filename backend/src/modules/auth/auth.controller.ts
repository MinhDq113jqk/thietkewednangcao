import {
  HttpCode,
  Controller,
  Get,
  Post,
  Delete,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';
import { AuthGuard } from '../../common/guards/auth.guard';

import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Req() req: AppRequest, @Res() res: Response) { return this.service.forgotPassword(req, res); }
  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Req() req: AppRequest, @Res() res: Response) { return this.service.resetPassword(req, res); }
  @Post('verify-email')
  @HttpCode(200)
  verifyEmail(@Req() req: AppRequest, @Res() res: Response) { return this.service.verifyEmail(req, res); }
  @Post('request-verification')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  requestVerification(@Req() req: AppRequest, @Res() res: Response) { return this.service.requestVerification(req, res); }
  @Get('sessions')
  @UseGuards(AuthGuard)
  sessions(@Req() req: AppRequest, @Res() res: Response) { return this.service.sessions(req, res); }
  @Delete('sessions/:id')
  @UseGuards(AuthGuard)
  revokeSession(@Req() req: AppRequest, @Res() res: Response) { return this.service.revokeSession(req, res); }
  @Delete('sessions')
  @UseGuards(AuthGuard)
  revokeAll(@Req() req: AppRequest, @Res() res: Response) { return this.service.revokeAll(req, res); }

  @Post('register')
  @HttpCode(200)
  register(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.register(request, response);
  }

  @Post('login')
  @HttpCode(200)
  login(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.login(request, response);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.refresh(request, response);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.me(request, response);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.logout(request, response);
  }
}
