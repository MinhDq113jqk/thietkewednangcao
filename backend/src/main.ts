import { createApplication } from './bootstrap';
import type { AddressInfo } from 'node:net';

async function main() {
  let app: Awaited<ReturnType<typeof createApplication>> | undefined;
  try {
    app = await createApplication();
    await app.listen(Number(process.env.PORT || 3000));
    const address = app.getHttpServer().address() as AddressInfo;
    console.log(`Server running on port ${address.port}`);
  } catch (error) {
    const { sequelize } = require('./database/connection');
    const { databaseFailure } = require('./database/check');
    const diagnostic =
      error.code === 'EADDRINUSE'
        ? {
            code: error.code,
            message: 'Không mở được cổng API. Kiểm tra PORT.',
          }
        : databaseFailure(error);
    console.error(JSON.stringify(diagnostic));
    if (app) await app.close();
    else await sequelize.close();
    process.exitCode = 1;
  }
}

void main();
