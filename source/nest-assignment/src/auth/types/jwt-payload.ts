import { UserRole } from '../entities/user.entity';

export interface JwtPayload {
  sub: number;
  username: string;
  role: UserRole;
}
