import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User, UserRole } from './entities/user.entity';
import { JwtPayload } from './types/jwt-payload';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{
    token: string;
    user: Pick<User, 'id' | 'username' | 'role' | 'createdAt'>;
  }> {
    const username = dto.username.trim().toLowerCase();
    const existing = await this.users.findOneBy({ username });

    if (existing) {
      throw new ConflictException('Username đã tồn tại');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    let user: User;
    try {
      user = await this.users.save(
        this.users.create({
          username,
          passwordHash,
          role: UserRole.USER,
        }),
      );
    } catch (error: unknown) {
      // The unique index remains the final protection if two requests race.
      const code = (error as { driverError?: { code?: string } }).driverError?.code;
      if (code === '23505') {
        throw new ConflictException('Username đã tồn tại');
      }
      throw error;
    }
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    const token = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: '15m',
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  }

  async login(dto: LoginDto): Promise<{
    token: string;
    user: Pick<User, 'id' | 'username' | 'role' | 'createdAt'>;
  }> {
    const username = dto.username.trim().toLowerCase();
    const user = await this.users.findOneBy({ username });
    const passwordMatches = user
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Username hoặc mật khẩu không đúng');
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    const token = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: '15m',
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  }
}
