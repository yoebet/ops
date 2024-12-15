import { Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from '@/auth/auth.service';
import { LocalAuthGuard } from '@/auth/guards/local-auth.guard';
import { ValueResult } from '@/common/api-result';
import { LoginInfo } from '@/auth/login-info';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { User } from '@/db/models/user';
import { Req } from '@/common/web.types';

@Controller('session')
export class SessionController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post()
  async login(@Request() req: Req): Promise<ValueResult<LoginInfo>> {
    const li = await this.authService.login(req.user);
    return ValueResult.value(li);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUserinfo(@Request() req: Req): Promise<ValueResult<User>> {
    const user = await User.findOneBy({ id: req.user?.userId });
    return ValueResult.value(user);
  }
}
