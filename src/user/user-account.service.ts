import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, User } from '@/db/models/user';
import { AppLogger } from '@/common/app-logger';

@Injectable()
export class UserAccountService {
  protected siteSalt: string;

  constructor(
    protected configService: ConfigService,
    protected logger: AppLogger,
  ) {
    logger.setContext('UserAccountService');
    this.siteSalt = configService.get<string>('auth.siteSalt');
    logger.debug(`siteSalt: ${this.siteSalt}`);
  }

  async authenticate(username: string, password: string): Promise<User> {
    if (!password) {
      return null;
    }
    const userPass = await User.findOne({
      select: { password: true },
      where: { username },
    });
    if (!userPass) {
      return null;
    }
    const match = this.checkPass(password, userPass.password);
    if (match) {
      return User.findOneBy({ username });
    }
    return null;
  }

  protected saltPass(pass: string): string {
    return pass + '.' + this.siteSalt;
  }

  hashPass(pass: string): string {
    return bcrypt.hashSync(this.saltPass(pass), 10);
  }

  checkPass(pass: string, hashedPass: string): boolean {
    return bcrypt.compareSync(this.saltPass(pass), hashedPass);
  }

  async createUser(vo: CreateUserDto): Promise<User> {
    const user = new User();
    user.username = vo.username;
    user.password = this.hashPass(vo.password);
    user.email = vo.email;
    user.role = vo.role;
    await user.save();
    delete user.password;
    return user;
  }
}
