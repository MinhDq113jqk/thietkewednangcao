import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 50 })
  username!: string;

  @Column({ length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 20, default: UserRole.USER })
  role!: UserRole;

  @CreateDateColumn()
  createdAt!: Date;
}
