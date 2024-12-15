import { Column, Entity } from 'typeorm';
import { BaseModel } from '@/db/models/base-model';

@Entity()
export class User extends BaseModel {
  @Column({ unique: true })
  username: string;

  @Column({ select: false })
  password?: string;

  @Column({ nullable: true })
  role?: string;

  @Column({ nullable: true })
  email?: string;
}

export class CreateUserDto {
  username: string;
  password: string;
  role?: string;
  email?: string;
}

export class UpdateUserDto {
  role?: string;
  email?: string;
}

export class PasswordResetDto {
  username: string;
  newPassword: string;
}

export class MyPasswordResetDto {
  password: string;
  newPassword: string;
}
