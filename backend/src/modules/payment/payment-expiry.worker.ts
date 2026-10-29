import { Injectable, OnApplicationBootstrap, BeforeApplicationShutdown } from '@nestjs/common';

const { paymentWindowMinutes, expireUnpaidOrders } = require('../../services/paymentExpiry.service');

@Injectable()
export class PaymentExpiryWorker implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private timer: ReturnType<typeof setInterval>;
  private running: Promise<void> | undefined;

  onApplicationBootstrap() {
    paymentWindowMinutes();
    if (process.env.PAYMENT_EXPIRY_WORKER_ENABLED === 'false') return;
    this.tick();
    this.timer = setInterval(() => this.tick(), 15000);
    this.timer.unref();
  }

  private tick() {
    if (this.running) return;
    this.running = expireUnpaidOrders().then(() => undefined).catch(() => {
      console.error('Payment expiry batch failed; will retry on the next interval');
    }).finally(() => { this.running = undefined; });
  }

  async beforeApplicationShutdown() {
    clearInterval(this.timer);
    await this.running;
  }
}
