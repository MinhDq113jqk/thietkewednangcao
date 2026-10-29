import { Injectable, OnApplicationBootstrap, BeforeApplicationShutdown } from '@nestjs/common';
const { dispatchNotifications } = require('../../services/notification.service');

@Injectable()
export class NotificationWorker implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private timer: ReturnType<typeof setInterval>;
  private running: Promise<void> | undefined;
  onApplicationBootstrap() {
    if (process.env.NOTIFICATION_WORKER_ENABLED === 'false') return;
    this.tick();
    this.timer = setInterval(() => this.tick(), 15000);
    this.timer.unref();
  }
  private tick() {
    if (this.running) return;
    this.running = dispatchNotifications().then(() => undefined).catch(() => {
      console.error('Notification batch failed; will retry on the next interval');
    }).finally(() => { this.running = undefined; });
  }
  async beforeApplicationShutdown() { clearInterval(this.timer); await this.running; }
}
