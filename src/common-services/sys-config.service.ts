import { In } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { groupBy, parseInt, toPairs } from 'lodash';
import { AppLogger } from '@/common/app-logger';
import { SysConfig } from '@/db/models/sys/sys-config';
import { ValueType, TrueValues } from '@/common/sys-config.type';

@Injectable()
export class SysConfigService {
  constructor(private logger: AppLogger) {
    logger.setContext('SysConfigService');
  }

  async getScopesConfigs(
    ...scopes: string[]
  ): Promise<{ [scope: string]: Record<string, any> }> {
    const sysConfigArray = await SysConfig.find({
      where: { scope: In(scopes) },
    });
    const scopeGroups = groupBy(sysConfigArray, 'scope');
    return Object.fromEntries(
      toPairs(scopeGroups).map(([scope, scopeConfigArray]) => {
        const scopedConfigs = Object.fromEntries(
          scopeConfigArray.map((item) => [item.key, this.convertValue(item)]),
        );
        return [scope, scopedConfigs];
      }),
    );
  }

  async getConfig(scope: string, key: string): Promise<any> {
    const sysConfig = await SysConfig.findOne({
      where: { scope: scope, key: key },
    });
    return this.convertValue(sysConfig);
  }

  private convertValue(sysConfig: SysConfig) {
    if (!sysConfig || !sysConfig.valueType) {
      return undefined;
    }
    switch (sysConfig.valueType) {
      case ValueType.boolean:
        return TrueValues.includes(sysConfig.value);
      case ValueType.number:
        return Number(sysConfig.value);
      case ValueType.integer:
        return parseInt(sysConfig.value);
      case ValueType.json:
        return JSON.parse(sysConfig.value);
      default: // string
        return sysConfig.value;
    }
  }
}
