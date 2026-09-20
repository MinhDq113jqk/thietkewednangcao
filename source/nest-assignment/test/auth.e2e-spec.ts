import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import * as bcrypt from 'bcrypt';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { AdminController } from '../src/admin/admin.controller';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { User, UserRole } from '../src/auth/entities/user.entity';

describe('Auth & RBAC Integration / E2E Tests (In-Memory Safe)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let usersStore: Map<number, User>;
  let nextId: number;

  const JWT_SECRET = 'super-secret-integration-test-key-32-chars-long';
  const SESSION_SECRET = 'session-secret-integration-test-key-32-chars';

  // In-memory thread-safe mock repository simulating PostgreSQL constraints
  let saveMutex: Promise<void> = Promise.resolve();

  const mockUsersRepository = {
    findOneBy: jest.fn(async (criteria: { username?: string; id?: number }) => {
      for (const user of usersStore.values()) {
        if (criteria.username && user.username === criteria.username) {
          return { ...user };
        }
        if (criteria.id && user.id === criteria.id) {
          return { ...user };
        }
      }
      return null;
    }),

    create: jest.fn((entityLike: Partial<User>) => {
      return { ...entityLike } as User;
    }),

    save: jest.fn(async (entity: Partial<User>) => {
      // Use a mutex to simulate database table lock / unique index check under concurrency
      let release: () => void = () => undefined;
      const acquire = new Promise<void>((resolve) => {
        release = resolve;
      });
      const previous = saveMutex;
      saveMutex = (async () => {
        await previous;
      })();

      await previous;
      try {
        // Check unique constraint violation
        for (const existing of usersStore.values()) {
          if (
            existing.username.toLowerCase() === entity.username?.toLowerCase() &&
            existing.id !== entity.id
          ) {
            const pgError = new Error('duplicate key value violates unique constraint "users_username_key"');
            (pgError as any).driverError = { code: '23505' };
            throw pgError;
          }
        }

        const id = entity.id ?? nextId++;
        const savedUser: User = {
          id,
          username: entity.username!,
          passwordHash: entity.passwordHash!,
          role: entity.role ?? UserRole.USER,
          createdAt: entity.createdAt ?? new Date(),
        };
        usersStore.set(id, savedUser);
        return { ...savedUser };
      } finally {
        release();
      }
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_SECRET,
              SESSION_SECRET,
              NODE_ENV: 'test',
              PORT: '3100',
            }),
          ],
        }),
        PassportModule,
        JwtModule.register({
          secret: JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AuthController, AdminController],
      providers: [
        AuthService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Exact middlewares from src/main.ts
    app.use(cookieParser());
    app.use(
      session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          sameSite: 'strict',
          secure: false,
          maxAge: 1000 * 60 * 60,
        },
      }),
    );
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  beforeEach(() => {
    usersStore = new Map<number, User>();
    nextId = 1;
    saveMutex = Promise.resolve();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  // Helper to extract cookie from Set-Cookie header
  const extractCookie = (headers: Record<string, any>, cookieName: string): string | undefined => {
    const setCookie = headers['set-cookie'];
    if (!setCookie) return undefined;
    const cookies: string[] = Array.isArray(setCookie) ? setCookie : [setCookie];
    return cookies.find((c) => c.startsWith(`${cookieName}=`));
  };

  const getCookieValue = (headers: Record<string, any>, cookieName: string): string => {
    const raw = extractCookie(headers, cookieName);
    if (!raw) return '';
    return raw.split(';')[0];
  };

  describe('POST /auth/register', () => {
    it('Happy path: should register user, return 201, and set session & access_token cookies', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'tester1',
          password: 'Password123!',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        message: 'Đăng ký thành công',
        user: {
          id: 1,
          username: 'tester1',
          role: 'user',
        },
        session: {
          authenticated: true,
          userId: 1,
        },
      });
      expect(res.body.user.passwordHash).toBeUndefined();

      // Cookie assertions
      const accessTokenCookie = extractCookie(res.headers, 'access_token');
      expect(accessTokenCookie).toBeDefined();
      expect(accessTokenCookie).toContain('HttpOnly');
      expect(accessTokenCookie).toContain('SameSite=Strict');

      const sessionCookie = extractCookie(res.headers, 'connect.sid');
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');
    });

    it('Boundary / Validation Failure: should return 400 when password is too short (< 8 chars)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'tester_val',
          password: '123',
        })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('password must be longer than or equal to 8')]),
      );
    });

    it('Boundary / Validation Failure: should return 400 when username contains forbidden characters', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'invalid user@!',
          password: 'ValidPassword123!',
        })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining(['username chỉ gồm chữ cái, số, dấu chấm, gạch dưới hoặc gạch ngang']),
      );
    });

    it('Duplicate username: should return 409 Conflict when username is already taken', async () => {
      // Register first time
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'duplicate_user', password: 'Password123!' })
        .expect(201);

      // Register second time with same username (case-insensitive test)
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'DUPLICATE_USER', password: 'Password123!' })
        .expect(409);

      expect(res.body.message).toBe('Username đã tồn tại');
    });

    it('Concurrent requests race condition: exactly one succeeds and the other gets 409 Conflict', async () => {
      const username = 'race_condition_user';
      const password = 'Password123!';

      // Fire 2 concurrent registration requests at the exact same moment
      const [res1, res2] = await Promise.all([
        request(app.getHttpServer()).post('/auth/register').send({ username, password }),
        request(app.getHttpServer()).post('/auth/register').send({ username, password }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 409]);

      const conflictRes = res1.status === 409 ? res1 : res2;
      expect(conflictRes.body.message).toBe('Username đã tồn tại');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Seed a user in the store
      const passwordHash = await bcrypt.hash('SecurePassword123!', 10);
      usersStore.set(1, {
        id: 1,
        username: 'existinguser',
        passwordHash,
        role: UserRole.USER,
        createdAt: new Date(),
      });
      nextId = 2;
    });

    it('Happy path: should login successfully, return user info and set cookies', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'ExistingUser',
          password: 'SecurePassword123!',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        message: 'Đăng nhập thành công',
        user: {
          id: 1,
          username: 'existinguser',
          role: 'user',
        },
        session: {
          authenticated: true,
          userId: 1,
        },
      });

      const accessTokenCookie = extractCookie(res.headers, 'access_token');
      expect(accessTokenCookie).toBeDefined();
      expect(accessTokenCookie).toContain('HttpOnly');
    });

    it('Error handling: should return 401 Unauthorized when password is incorrect', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'existinguser',
          password: 'WrongPassword!',
        })
        .expect(401);

      expect(res.body.message).toBe('Username hoặc mật khẩu không đúng');
    });

    it('Error handling: should return 401 Unauthorized when username does not exist', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'ghost_user',
          password: 'SecurePassword123!',
        })
        .expect(401);

      expect(res.body.message).toBe('Username hoặc mật khẩu không đúng');
    });
  });

  describe('GET /auth/me - Cookie-only JWT Extraction and Expiration', () => {
    let validToken: string;

    beforeEach(async () => {
      validToken = await jwtService.signAsync(
        { sub: 1, username: 'alice', role: UserRole.USER },
        { secret: JWT_SECRET, expiresIn: '15m' },
      );
    });

    it('Cookie extraction: should authenticate successfully using access_token cookie', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', `access_token=${validToken}`)
        .expect(200);

      expect(res.body).toEqual({
        message: 'JWT hợp lệ và cookie đã được xác thực',
        user: {
          sub: 1,
          username: 'alice',
          role: 'user',
          iat: expect.any(Number),
          exp: expect.any(Number),
        },
      });
    });

    it('Missing JWT: should return 401 Unauthorized when no cookie or header is provided', async () => {
      const res = await request(app.getHttpServer()).get('/auth/me').expect(401);
      expect(res.body.statusCode).toBe(401);
    });

    it('Expired JWT: should return 401 Unauthorized when access_token has expired', async () => {
      const expiredToken = await jwtService.signAsync(
        { sub: 1, username: 'alice', role: UserRole.USER },
        { secret: JWT_SECRET, expiresIn: '-1s' },
      );

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', `access_token=${expiredToken}`)
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });

    it('Tampered / Malformed JWT: should return 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', 'access_token=malformed.fake.jwt')
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });

    it('Bearer token extraction fallback: should authenticate when passed via Authorization header', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(res.body.user.username).toBe('alice');
    });
  });

  describe('GET /admin/profile - RBAC RolesGuard Protection', () => {
    it('User role receives 403 Forbidden', async () => {
      const userToken = await jwtService.signAsync(
        { sub: 2, username: 'regular_user', role: UserRole.USER },
        { secret: JWT_SECRET, expiresIn: '15m' },
      );

      const res = await request(app.getHttpServer())
        .get('/admin/profile')
        .set('Cookie', `access_token=${userToken}`)
        .expect(403);

      expect(res.body.statusCode).toBe(403);
      expect(res.body.message).toBe('Forbidden resource');
    });

    it('Admin role receives 200 OK', async () => {
      const adminToken = await jwtService.signAsync(
        { sub: 1, username: 'admin_boss', role: UserRole.ADMIN },
        { secret: JWT_SECRET, expiresIn: '15m' },
      );

      const res = await request(app.getHttpServer())
        .get('/admin/profile')
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({
        message: 'Bạn đã vượt qua JWT Guard và Role Guard',
        user: {
          sub: 1,
          username: 'admin_boss',
          role: 'admin',
          iat: expect.any(Number),
          exp: expect.any(Number),
        },
        note: expect.stringContaining('không phải màn quản trị của SouvenirShop'),
      });
    });

    it('Unauthenticated request receives 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/profile')
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });
  });

  describe('POST /auth/logout - Session and Cookie cleanup', () => {
    it('should clear access_token cookie and destroy session', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(201);

      expect(res.body).toEqual({ message: 'Đã đăng xuất' });

      // Check access_token cookie is cleared
      const setCookie = res.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      const clearedCookie = Array.isArray(setCookie)
        ? setCookie.find((c) => c.startsWith('access_token='))
        : setCookie;
      expect(clearedCookie).toMatch(/access_token=;.*(Expires=|Max-Age=0)/);
    });
  });

  describe('Full End-to-End User Flow', () => {
    it('Register -> Access /auth/me -> Attempt Admin (403) -> Promoted to Admin -> Login -> Access Admin (200) -> Logout', async () => {
      // 1. Register
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'flow_user', password: 'FlowPassword123!' })
        .expect(201);

      const userCookie = getCookieValue(registerRes.headers, 'access_token');
      expect(userCookie).toBeTruthy();

      // 2. Access /auth/me with registered cookie
      const meRes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', userCookie)
        .expect(200);
      expect(meRes.body.user.username).toBe('flow_user');
      expect(meRes.body.user.role).toBe('user');

      // 3. Attempt Admin profile -> 403 Forbidden
      await request(app.getHttpServer())
        .get('/admin/profile')
        .set('Cookie', userCookie)
        .expect(403);

      // 4. Promote user to admin in store (mimicking SQL: UPDATE users SET role = 'admin' WHERE username = 'flow_user')
      const userId = registerRes.body.user.id;
      const userInDb = usersStore.get(userId)!;
      userInDb.role = UserRole.ADMIN;

      // 5. Login again to receive refreshed JWT with role admin
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'flow_user', password: 'FlowPassword123!' })
        .expect(201);

      const adminCookie = getCookieValue(loginRes.headers, 'access_token');

      // 6. Access /admin/profile with new cookie -> 200 OK
      const adminRes = await request(app.getHttpServer())
        .get('/admin/profile')
        .set('Cookie', adminCookie)
        .expect(200);
      expect(adminRes.body.user.role).toBe('admin');

      // 7. Logout
      const logoutRes = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', adminCookie)
        .expect(201);
      expect(logoutRes.body.message).toBe('Đã đăng xuất');
    });
  });
});
