import { Injectable } from '@nestjs/common';
import { UserDataRequest } from '@/oflow-server/commands';
import { AppLogger } from '@/common/app-logger';
import { UserSetting } from '@/db/models/user-setting';
import { UserInfo } from '@/common-web/auth/user-info';
import { FindOptionsWhere } from 'typeorm/find-options/FindOptionsWhere';
import { User } from '@/db/models/user';

@Injectable()
export class OflowUserDataService {
  constructor(private logger: AppLogger) {
    logger.setContext('oflow-user-data');
  }

  protected async saveUserIfNeeded(userInfo: UserInfo): Promise<void> {
    const { userId, role, bs } = userInfo;
    let user = await User.findOneBy({ userId });
    if (user) {
      return;
    }
    user = new User();
    user.userId = userId;
    user.bs = bs;
    user.role = role;
    await User.save(user);
  }

  async operateUserData(
    req: UserDataRequest,
    userInfo?: UserInfo,
  ): Promise<any[]> {
    if (!userInfo?.userId) {
      return [];
    }
    const userId = userInfo.userId;

    const { cat, op, scope, key, params } = req;

    if (op === 'load') {
      const where: FindOptionsWhere<UserSetting> = {
        userId,
        cat,
        scope,
      };
      if (key) {
        where.key = key;
      }
      const settings = await UserSetting.find({
        where,
      });
      for (const s of settings) {
        delete s.userId;
      }
      return settings;
    }
    if (op === 'save') {
      if (!params?.content) {
        return [];
      }

      await this.saveUserIfNeeded(userInfo).catch((e) => this.logger.error(e));

      const { memo, digest = {}, content } = params;

      const keys: Partial<UserSetting> = {
        userId,
        cat,
        scope,
        key,
      };
      const existed = await UserSetting.findOne({
        where: {
          userId,
          cat,
          scope,
          key,
        },
        select: ['id'],
      });
      if (existed) {
        await UserSetting.update(existed.id, {
          memo,
          digest,
          content,
        });
      } else {
        const dto: Partial<UserSetting> = {
          ...keys,
          memo,
          digest,
          content,
        };
        const setting = new UserSetting();
        Object.assign(setting, dto);
        await UserSetting.save(setting);
      }
    }
    return [];
  }
}
