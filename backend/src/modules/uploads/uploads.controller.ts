import {
  HttpCode,
  BadRequestException,
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UploadsService } from './uploads.service';

const acceptedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Controller('api/uploads')
@UseGuards(AuthGuard, RolesGuard)
@Roles('seller', 'admin')
export class UploadsController {
  constructor(private readonly service: UploadsService) {}

  @Post('image')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        if (!acceptedImageTypes.has(file.mimetype)) {
          callback(new BadRequestException('Chi chap nhan file anh'), false);
        } else callback(null, true);
      },
    }),
  )
  upload(@Req() request: AppRequest, @Res() response: Response) {
    return this.service.uploadImage(request, response);
  }
}
