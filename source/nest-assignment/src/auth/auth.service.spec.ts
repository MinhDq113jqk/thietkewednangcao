import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRole } from './entities/user.entity';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService Unit Tests', () => {
  let service: AuthService;
  let usersRepository: {
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };
  let configService: {
    getOrThrow: jest.Mock;
  };

  const mockUser: User = {
    id: 1,
    username: 'demouser',
    passwordHash: '$2b$12$hashedPasswordExample',
    role: UserRole.USER,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    usersRepository = {
      findOneBy: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto } as User)),
      save: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
    };

    configService = {
      getOrThrow: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'super-test-secret';
        throw new Error(`Missing config: ${key}`);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully (happy path)', async () => {
      usersRepository.findOneBy.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$newHashedPassword');
      usersRepository.save.mockResolvedValue({
        id: 10,
        username: 'newuser',
        passwordHash: '$2b$12$newHashedPassword',
        role: UserRole.USER,
        createdAt: new Date('2026-09-20T00:00:00Z'),
      } as User);

      const result = await service.register({
        username: '  NewUser  ',
        password: 'Password123!',
      });

      // Assert username is normalized (trimmed and lowercased)
      expect(usersRepository.findOneBy).toHaveBeenCalledWith({ username: 'newuser' });
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
      expect(usersRepository.create).toHaveBeenCalledWith({
        username: 'newuser',
        passwordHash: '$2b$12$newHashedPassword',
        role: UserRole.USER,
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: 10, username: 'newuser', role: UserRole.USER },
        { secret: 'super-test-secret', expiresIn: '15m' },
      );
      expect(result).toEqual({
        token: 'signed.jwt.token',
        user: {
          id: 10,
          username: 'newuser',
          role: UserRole.USER,
          createdAt: expect.any(Date),
        },
      });
      // Assert passwordHash is never leaked in the return value
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('should throw ConflictException if username already exists in initial check', async () => {
      usersRepository.findOneBy.mockResolvedValue(mockUser);

      await expect(
        service.register({ username: 'demouser', password: 'Password123!' }),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.register({ username: 'DEMOUSER', password: 'Password123!' }),
      ).rejects.toThrow('Username đã tồn tại');

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('should handle race condition: throw ConflictException when concurrent save triggers PostgreSQL unique violation (code 23505)', async () => {
      // Simulating: two requests pass findOneBy({ username }) simultaneously (returning null)
      usersRepository.findOneBy.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashed');

      const pgUniqueViolationError = new Error('duplicate key value violates unique constraint');
      (pgUniqueViolationError as any).driverError = { code: '23505' };
      usersRepository.save.mockRejectedValue(pgUniqueViolationError);

      await expect(
        service.register({ username: 'concurrent_user', password: 'Password123!' }),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.register({ username: 'concurrent_user', password: 'Password123!' }),
      ).rejects.toThrow('Username đã tồn tại');
    });

    it('should rethrow unexpected database errors during save without masking them as ConflictException', async () => {
      usersRepository.findOneBy.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashed');

      const dbConnectionError = new Error('Connection timeout to PostgreSQL');
      (dbConnectionError as any).driverError = { code: '08006' };
      usersRepository.save.mockRejectedValue(dbConnectionError);

      await expect(
        service.register({ username: 'user_err', password: 'Password123!' }),
      ).rejects.toThrow('Connection timeout to PostgreSQL');
    });

    it('should bubble up error when JWT_SECRET is not configured', async () => {
      usersRepository.findOneBy.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashed');
      usersRepository.save.mockResolvedValue(mockUser);
      configService.getOrThrow.mockImplementation(() => {
        throw new Error('JWT_SECRET is missing');
      });

      await expect(
        service.register({ username: 'validuser', password: 'Password123!' }),
      ).rejects.toThrow('JWT_SECRET is missing');
    });
  });

  describe('login', () => {
    it('should login successfully with correct username and password (happy path)', async () => {
      usersRepository.findOneBy.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        username: '  DemoUser  ',
        password: 'ValidPassword123!',
      });

      expect(usersRepository.findOneBy).toHaveBeenCalledWith({ username: 'demouser' });
      expect(bcrypt.compare).toHaveBeenCalledWith('ValidPassword123!', mockUser.passwordHash);
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: mockUser.id, username: mockUser.username, role: mockUser.role },
        { secret: 'super-test-secret', expiresIn: '15m' },
      );
      expect(result).toEqual({
        token: 'signed.jwt.token',
        user: {
          id: mockUser.id,
          username: mockUser.username,
          role: mockUser.role,
          createdAt: mockUser.createdAt,
        },
      });
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('should throw UnauthorizedException when username does not exist', async () => {
      usersRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.login({ username: 'nonexistent', password: 'AnyPassword123' }),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.login({ username: 'nonexistent', password: 'AnyPassword123' }),
      ).rejects.toThrow('Username hoặc mật khẩu không đúng');

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password does not match hash', async () => {
      usersRepository.findOneBy.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ username: 'demouser', password: 'WrongPassword123' }),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.login({ username: 'demouser', password: 'WrongPassword123' }),
      ).rejects.toThrow('Username hoặc mật khẩu không đúng');

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should handle case insensitivity during login', async () => {
      usersRepository.findOneBy.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login({
        username: 'DEMOUSER',
        password: 'ValidPassword123!',
      });

      expect(usersRepository.findOneBy).toHaveBeenCalledWith({ username: 'demouser' });
    });
  });
});
