import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../entities/user.entity';

describe('RolesGuard Unit Tests', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const createMockExecutionContext = (user?: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true if no roles are required (undefined metadata)', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext();

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should return true if empty roles array is configured', () => {
      reflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockExecutionContext();

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should return true when user role matches required role (Admin accessing Admin route)', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({
        sub: 1,
        username: 'adminuser',
        role: UserRole.ADMIN,
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should return false when user role does not match required role (User accessing Admin route)', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({
        sub: 2,
        username: 'regularuser',
        role: UserRole.USER,
      });

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should return false when request has no user object (unauthenticated or missing user)', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext(undefined);

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should return false when user object exists but role is undefined or empty', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({ sub: 3, username: 'norole' });

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should return false when user role is unknown or not in allowed enum', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({
        sub: 4,
        username: 'guest',
        role: 'guest',
      });

      expect(guard.canActivate(context)).toBe(false);
    });
  });
});
