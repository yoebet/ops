import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@/db/models/user';
import { UserAccountService } from '@/common-services/user-account.service';
import { LoginInfo } from './login-info';
import { JwtPayload } from '@/auth/user-info';

@Injectable()
export class AuthService {
  constructor(
    private readonly userAccountService: UserAccountService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    return this.userAccountService.authenticate(username, password);
  }

  async login(ui: JwtPayload): Promise<LoginInfo> {
    if (!ui) {
      return undefined;
    }
    const token = this.jwtService.sign(ui);
    const user = await User.findOneBy({ id: ui.userId });
    const li = new LoginInfo();
    li.user = user;
    li.accessToken = token;
    return li;
  }
}
