import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DATABASE_MODELS } from '../../database/database.module';
import type { AppRequest } from '../types/app-request';

const jwt = require('jsonwebtoken');
const { matchesAuthVersion } = require('../../utils/authTokens');
const { validSession } = require('../../services/accountSecurity.service');

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(DATABASE_MODELS) private readonly models: any) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AppRequest>();
    const header = request.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Chưa xác thực');
    }
    let payload: { id: string; sid?: string };
    try {
      payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
    const user = await this.models.User.findByPk(payload.id, {
      attributes: { exclude: ['password', 'refreshToken'] },
    });
    if (!user || !user.isActive || !matchesAuthVersion(payload, user) || !await validSession(this.models, payload, user))
      throw new UnauthorizedException('Tài khoản không hợp lệ');
    request.user = user;
    request.sessionId = payload.sid;
    return true;
  }
}

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(@Inject(DATABASE_MODELS) private readonly models: any) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AppRequest>();
    const header = request.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      try {
        const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
        const user = await this.models.User.findByPk(payload.id, {
          attributes: { exclude: ['password', 'refreshToken'] },
        });
        if (user?.isActive && matchesAuthVersion(payload, user) && await validSession(this.models, payload, user)) {
          request.user = user;
          request.sessionId = payload.sid;
        }
      } catch {
        // Recommendations remain public when an optional token is invalid.
      }
    }
    return true;
  }
}
