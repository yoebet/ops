import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command, Console } from 'nestjs-console';
import {
  User,
  CreateUserDto,
  UpdateUserDto,
  PasswordResetDto,
} from '@/db/models/sys/user';
import { UserAccountService } from '@/common-services/user-account.service';
import { ApiResult } from '@/common/api-result';
import { AppLogger } from '@/common/app-logger';

@Injectable()
@Console({
  command: 'user',
  description: 'UsersService',
})
export class UsersService {
  constructor(
    protected configService: ConfigService,
    protected userAccountService: UserAccountService,
    protected logger: AppLogger,
  ) {
    logger.setContext('UsersService');
  }

  @Command({
    command: 'create <username> <password> [role]',
    description: '创建用户',
  })
  async consoleCreate(
    username: string,
    password: string,
    role = 'admin',
  ): Promise<void> {
    const createUserDto = { username, password, role } as CreateUserDto;
    const user = await this.createUser(createUserDto);
    this.logger.log(JSON.stringify(user, null, 2));
  }

  @Command({
    command: 'get <username>',
    description: '查询用户',
  })
  async consoleGetUser(username: string): Promise<void> {
    const user = await User.findOneBy({ username });
    this.logger.log(JSON.stringify(user, null, 2));
  }

  async createUser(vo: CreateUserDto): Promise<User> {
    return this.userAccountService.createUser(vo);
  }

  async authenticate(username: string, password: string): Promise<User> {
    return this.userAccountService.authenticate(username, password);
  }

  async update(id: number, dto: UpdateUserDto): Promise<void> {
    await User.update(id, { role: dto.role, email: dto.email });
  }

  async remove(id: number): Promise<void> {
    await User.delete(id);
  }

  async resetPass(passwordResetDto: PasswordResetDto): Promise<ApiResult> {
    const { username, newPassword } = passwordResetDto;
    const password = this.userAccountService.hashPass(newPassword);
    await User.update({ username }, { password });
    return ApiResult.success();
  }
}
