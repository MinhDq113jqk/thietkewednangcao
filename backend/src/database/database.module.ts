import {
  Global,
  Inject,
  Injectable,
  Module,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';

const { sequelize } = require('./connection');
const models = require('../models');
const { checkDatabase } = require('./check');

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';
export const DATABASE_MODELS = 'DATABASE_MODELS';

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  constructor(@Inject(DATABASE_CONNECTION) private readonly connection: any) {}

  async onModuleInit() {
    // SQL migrations are explicit: starting Nest never synchronizes or seeds tables.
    await checkDatabase();
  }

  async onApplicationShutdown() {
    await this.connection.close();
  }
}

@Global()
@Module({
  providers: [
    { provide: DATABASE_CONNECTION, useValue: sequelize },
    { provide: DATABASE_MODELS, useValue: models },
    DatabaseService,
  ],
  exports: [DATABASE_CONNECTION, DATABASE_MODELS, DatabaseService],
})
export class DatabaseModule {}
