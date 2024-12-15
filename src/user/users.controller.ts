import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from '@/user/users.service';
import {
  CreateUserDto,
  PasswordResetDto,
  UpdateUserDto,
  User,
} from '@/db/models/user';
import { Roles } from '@/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ListResult, ApiResult, ValueResult } from '@/common/api-result';

@Controller('sys/users')
@UseGuards(JwtAuthGuard)
@Roles('admin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<ListResult<User>> {
    const list = await User.find();
    return ListResult.list(list);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<ValueResult<User>> {
    const user = await User.findOneBy({ id: +id });
    return ValueResult.value(user);
  }

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<ValueResult<User>> {
    const value: User = await this.usersService.createUser(dto);
    return ValueResult.value(value);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<ApiResult> {
    await this.usersService.update(+id, dto);
    return ApiResult.success();
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ApiResult> {
    await this.usersService.remove(+id);
    return ApiResult.success();
  }

  @Post('resetPass')
  resetPass(@Body() dto: PasswordResetDto): Promise<ApiResult> {
    return this.usersService.resetPass(dto);
  }
}
