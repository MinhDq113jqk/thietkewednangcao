import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtPayload } from './types/jwt-payload';

type AuthenticatedRequest = Request & {
  user: JwtPayload;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: RegisterDto,
  ) {
    const result = await this.authService.register(dto);

    request.session.userId = result.user.id;
    response.cookie('access_token', result.token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
    });

    return {
      message: 'Đăng ký thành công',
      user: result.user,
      session: {
        authenticated: true,
        userId: request.session.userId,
      },
    };
  }

  @Post('login')
  async login(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: LoginDto,
  ) {
    const result = await this.authService.login(dto);

    request.session.userId = result.user.id;
    response.cookie('access_token', result.token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
    });

    return {
      message: 'Đăng nhập thành công',
      user: result.user,
      session: {
        authenticated: true,
        userId: request.session.userId,
      },
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return {
      message: 'JWT hợp lệ và cookie đã được xác thực',
      user: request.user,
    };
  }

  @Post('logout')
  logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token');
    request.session.destroy(() => undefined);
    return { message: 'Đã đăng xuất' };
  }
}
