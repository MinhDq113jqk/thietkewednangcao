import { Module } from '@nestjs/common';
import { SupportController, NotificationsController, OperationsAdminController } from './operations.controller';
import { NotificationWorker } from './notification.worker';
@Module({ controllers: [SupportController, NotificationsController, OperationsAdminController], providers: [NotificationWorker] })
export class OperationsModule {}
