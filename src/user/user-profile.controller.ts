import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiResult } from '@/common/api-result';
import { UsersService } from '@/user/users.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { MyPasswordResetDto, User } from '@/db/models/user';
import { CurrentUser } from '@/auth/decorators/user.decorator';

@Controller('sys/user-profile')
@UseGuards(JwtAuthGuard)
export class UserProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Post('resetPass')
  async resetPass(
    @CurrentUser() currentUser: User,
    @Body() dto: MyPasswordResetDto,
  ): Promise<ApiResult> {
    if (!currentUser) {
      return ApiResult.fail('未登录');
    }
    const username = currentUser.username;
    const { password, newPassword } = dto;
    const user = await this.usersService.authenticate(username, password);
    if (!user) {
      return ApiResult.fail('原密码错误');
    }

    return this.usersService.resetPass({ username, newPassword });
  }
}
