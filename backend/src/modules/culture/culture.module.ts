import { Module } from '@nestjs/common';
import { CultureService } from './culture.service';
import { CultureController } from './culture.controller';

@Module({
  controllers: [CultureController],
  providers: [CultureService],
})
export class CultureModule {}
