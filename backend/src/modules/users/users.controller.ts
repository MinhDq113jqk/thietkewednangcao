import {
  HttpCode,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Req,
  Res,
  UseGuards,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';
import { AuthGuard } from '../../common/guards/auth.guard';

import { UsersService } from './users.service';

@Controller('api/users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get('profile')
  getProfile(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.getProfile(request, response);
  }

  @Put('profile')
  updateProfile(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.updateProfile(request, response);
  }

  @Put('password')
  changePassword(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.changePassword(request, response);
  }

  @Get('addresses')
  getAddresses(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.getAddresses(request, response);
  }

  @Post('addresses')
  @HttpCode(200)
  addAddress(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.addAddress(request, response);
  }

  @Put('addresses/:id')
  updateAddress(@Req() request: AppRequest, @Res() response: Response, @Param('id', new ParseUUIDPipe()) _id: string) {
    return this.service.updateAddress(request, response);
  }

  @Delete('addresses/:id')
  deleteAddress(@Req() request: AppRequest, @Res() response: Response, @Param('id', new ParseUUIDPipe()) _id: string) {
    return this.service.deleteAddress(request, response);
  }
}
