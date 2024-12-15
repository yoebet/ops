import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@/db/models/user';
import { UserAccountService } from '@/common-services/user-account.service';
import { LoginInfo } from './login-info';
import { JwtPayload, UserInfo } from '@/auth/user-info';

@Injectable()
export class AuthService {
  constructor(
    private readonly userAccountService: UserAccountService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<User> {
    return this.userAccountService.authenticate(username, password);
  }

  async login(ui: UserInfo): Promise<LoginInfo> {
    if (!ui) {
      return undefined;
    }
    const pl: JwtPayload = {
      userId: ui.userId,
      username: ui.username,
      role: ui.role,
    };
    const token = this.jwtService.sign(pl);
    const user = await User.findOneBy({ id: ui.userId });
    return { user, accessToken: token };
  }
}
