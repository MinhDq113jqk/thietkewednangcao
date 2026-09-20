import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from './entities/user.entity';

describe('AuthController Unit Tests', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
  };

  const mockUser = {
    id: 1,
    username: 'testuser',
    role: UserRole.USER,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  const createMockRequest = (overrides = {}): any => ({
    session: {
      userId: undefined,
      destroy: jest.fn((cb) => cb && cb(null)),
    },
    user: undefined,
    ...overrides,
  });

  const createMockResponse = (): any => {
    const res: any = {};
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /auth/register', () => {
    it('should register user, set session userId, set httpOnly strict cookie, and return response payload', async () => {
      authService.register.mockResolvedValue({
        token: 'sample.jwt.token',
        user: mockUser,
      });

      const req = createMockRequest();
      const res = createMockResponse();

      const result = await controller.register(req, res, {
        username: 'testuser',
        password: 'Password123!',
      });

      expect(authService.register).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'Password123!',
      });
      expect(req.session.userId).toBe(mockUser.id);
      expect(res.cookie).toHaveBeenCalledWith('access_token', 'sample.jwt.token', {
        httpOnly: true,
        sameSite: 'strict',
        secure: false, // In test / non-production
        maxAge: 15 * 60 * 1000,
      });
      expect(result).toEqual({
        message: 'Đăng ký thành công',
        user: mockUser,
        session: {
          authenticated: true,
          userId: mockUser.id,
        },
      });
    });
  });

  describe('POST /auth/login', () => {
    it('should login user, set session userId, set httpOnly cookie, and return success payload', async () => {
      authService.login.mockResolvedValue({
        token: 'login.jwt.token',
        user: mockUser,
      });

      const req = createMockRequest();
      const res = createMockResponse();

      const result = await controller.login(req, res, {
        username: 'testuser',
        password: 'Password123!',
      });

      expect(authService.login).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'Password123!',
      });
      expect(req.session.userId).toBe(mockUser.id);
      expect(res.cookie).toHaveBeenCalledWith('access_token', 'login.jwt.token', {
        httpOnly: true,
        sameSite: 'strict',
        secure: false,
        maxAge: 15 * 60 * 1000,
      });
      expect(result).toEqual({
        message: 'Đăng nhập thành công',
        user: mockUser,
        session: {
          authenticated: true,
          userId: mockUser.id,
        },
      });
    });
  });

  describe('GET /auth/me', () => {
    it('should return authenticated user details from request', () => {
      const mockPayload = {
        sub: 1,
        username: 'testuser',
        role: UserRole.USER,
      };
      const req = createMockRequest({ user: mockPayload });

      const result = controller.me(req);

      expect(result).toEqual({
        message: 'JWT hợp lệ và cookie đã được xác thực',
        user: mockPayload,
      });
    });
  });

  describe('POST /auth/logout', () => {
    it('should clear access_token cookie and destroy session', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const result = controller.logout(req, res);

      expect(res.clearCookie).toHaveBeenCalledWith('access_token');
      expect(req.session.destroy).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Đã đăng xuất' });
    });
  });
});
