import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../types/app-request';

const { formatErrorPayload } = require('../middleware/errorResponse');

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<AppRequest>();
    const response = context.getResponse<Response>();
    if (response.headersSent) return;
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : exception.status || exception.statusCode || 500;
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    const original =
      exception instanceof HttpException ? exception.getResponse() : exception;
    const body =
      typeof original === 'string'
        ? { message: original }
        : {
            message: original.message || exception.message,
            code: original.code,
            details: original.details,
          };
    if (safeStatus >= 500) {
      console.error(
        JSON.stringify({
          level: 'error',
          type: 'app_error',
          requestId: request.requestId,
          method: request.method,
          path: request.path,
          status: safeStatus,
          code: exception.code,
        }),
      );
      if (process.env.NODE_ENV === 'production') body.message = 'Loi server';
    }
    response
      .status(safeStatus)
      .json(formatErrorPayload({ req: request, statusCode: safeStatus, body }));
  }
}
