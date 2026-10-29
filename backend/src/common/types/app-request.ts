import type { Request } from 'express';

// Sequelize instances retain update(), which account/profile handlers use.
export interface AppRequest extends Request {
  user: any;
  requestId?: string;
  sessionId?: string;
  file?: Express.Multer.File;
}
