import { Global, Module } from '@nestjs/common';
import { AuthGuard, OptionalAuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  providers: [AuthGuard, OptionalAuthGuard, RolesGuard],
  exports: [AuthGuard, OptionalAuthGuard, RolesGuard],
})
export class SecurityModule {}
