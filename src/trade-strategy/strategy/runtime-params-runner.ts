import { BaseRunner } from '@/trade-strategy/strategy/base-runner';
import { Strategy } from '@/db/models/strategy';
import { StrategyEnv, StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import { AppLogger } from '@/common/app-logger';
import * as _ from 'lodash';
import { TradeOpportunity } from '@/trade-strategy/strategy.types';

export abstract class RuntimeParamsRunner<
  ORP = any,
  CRP = any,
> extends BaseRunner {
  protected runtimeParams: {
    open: ORP;
    close: CRP;
  };

  protected constructor(
    protected strategy: Strategy,
    protected env: StrategyEnv,
    protected jobEnv: StrategyJobEnv,
    protected logger: AppLogger,
  ) {
    super(strategy, env, jobEnv, logger);
  }

  protected get strategyParams(): {
    open?: any;
    close?: any;
  } {
    return this.strategy.params;
  }

  protected getRuntimeSubParams(orderTag: string) {
    if (!this.runtimeParams) {
      this.runtimeParams = _.merge({}, this.strategyParams) as any;
    }
    let rp = this.runtimeParams[orderTag];
    if (!rp) {
      rp = {};
      this.runtimeParams[orderTag] = rp;
    }
    return rp;
  }

  protected getOpenRuntimeParams(): ORP {
    return this.getRuntimeSubParams('open');
  }

  protected getCloseRuntimeParams(): CRP {
    return this.getRuntimeSubParams('close');
  }

  protected async checkAndWaitOpportunity(): Promise<TradeOpportunity> {
    const currentDeal = this.strategy.currentDeal!;
    const lastOrder = currentDeal.lastOrder;
    if (lastOrder) {
      return this.checkAndWaitToCloseDeal();
    }
    return this.checkAndWaitToOpenDeal();
  }

  protected abstract checkAndWaitToOpenDeal(): Promise<TradeOpportunity>;

  protected abstract checkAndWaitToCloseDeal(): Promise<TradeOpportunity>;
}
