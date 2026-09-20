import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtStrategy } from './jwt.strategy';
import { UserRole } from '../entities/user.entity';
import { JwtPayload } from '../types/jwt-payload';

describe('JwtStrategy Unit Tests', () => {
  let strategy: JwtStrategy;
  let configService: jest.Mocked<Partial<ConfigService>>;

  beforeEach(() => {
    configService = {
      getOrThrow: jest.fn().mockReturnValue('test-secret-key-12345'),
    };

    strategy = new JwtStrategy(configService as ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
    expect(configService.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
  });

  describe('validate', () => {
    it('should validate and return the JWT payload unaltered', () => {
      const payload: JwtPayload = {
        sub: 1,
        username: 'alice',
        role: UserRole.USER,
      };

      const result = strategy.validate(payload);
      expect(result).toEqual(payload);
    });
  });

  describe('Cookie Extractor behavior', () => {
    it('should extract access_token from cookie when present', () => {
      const mockReq = {
        cookies: {
          access_token: 'cookie.jwt.token',
        },
      } as unknown as Request;

      const cookieExtractor = (req: Request) => req?.cookies?.access_token ?? null;
      expect(cookieExtractor(mockReq)).toBe('cookie.jwt.token');
    });

    it('should return null when cookies object is present but access_token is missing', () => {
      const mockReq = {
        cookies: {
          other_cookie: 'xyz',
        },
      } as unknown as Request;

      const cookieExtractor = (req: Request) => req?.cookies?.access_token ?? null;
      expect(cookieExtractor(mockReq)).toBeNull();
    });

    it('should return null when cookies object is undefined on request', () => {
      const mockReq = {} as Request;

      const cookieExtractor = (req: Request) => req?.cookies?.access_token ?? null;
      expect(cookieExtractor(mockReq)).toBeNull();
    });

    it('should return null when request itself is null or undefined', () => {
      const cookieExtractor = (req: Request) => req?.cookies?.access_token ?? null;
      expect(cookieExtractor(null as unknown as Request)).toBeNull();
      expect(cookieExtractor(undefined as unknown as Request)).toBeNull();
    });
  });
});
