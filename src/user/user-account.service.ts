import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { User } from '@/db/models/user';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserAccountService {
  constructor(private configService: ConfigService) {}

  async authenticate(username: string, password: string): Promise<User> {
    if (!password) {
      return null;
    }
    const user: User = await this.findByUsername(username, true);
    if (!user) {
      return null;
    }
    const match = this.checkPass(password, user.password);
    if (match) {
      return this.findByUsername(username);
    }
    return null;
  }

  findOne(id: number): Promise<User> {
    return User.findOneBy({ id });
  }

  findByUsername(username: string, selectPass = false): Promise<User> {
    return User.findOneBy({ username });
  }

  protected saltPass(pass) {
    return pass + '.' + this.configService.get('auth.siteSalt');
  }

  protected hashPass(pass) {
    return bcrypt.hashSync(this.saltPass(pass), 10);
  }

  protected checkPass(pass, hashedPass): boolean {
    return bcrypt.compareSync(this.saltPass(pass), hashedPass);
  }
}
