import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentExpiryWorker } from './payment-expiry.worker';
import { PaymentAdminController } from './payment-admin.controller';

@Module({
  controllers: [PaymentController, PaymentAdminController],
  providers: [PaymentService, PaymentExpiryWorker],
})
export class PaymentModule {}
