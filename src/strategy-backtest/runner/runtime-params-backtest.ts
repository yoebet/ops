import { StrategyJobEnv } from '@/strategy/env/strategy-env';
import { AppLogger } from '@/common/app-logger';
import * as _ from 'lodash';
import { CommonStrategyParams } from '@/strategy/strategy.types';
import { BaseBacktestRunner } from '@/strategy-backtest/runner/base-backtest-runner';
import { BacktestStrategy } from '@/db/models/strategy/backtest-strategy';
import { BacktestDeal } from '@/db/models/strategy/backtest-deal';
import { KlineDataService } from '@/data-service/kline-data.service';
import { OrderTag } from '@/db/models/ex-order';

export abstract class RuntimeParamsBacktest<
  ORP = any,
  CRP = ORP,
> extends BaseBacktestRunner {
  protected _runtimeParams: CommonStrategyParams<ORP, CRP>;

  protected constructor(
    protected readonly strategy: BacktestStrategy,
    protected klineDataService: KlineDataService,
    protected jobEnv: StrategyJobEnv,
    protected logger: AppLogger,
  ) {
    super(strategy, klineDataService, jobEnv, logger);
  }

  protected get strategyParams(): CommonStrategyParams<ORP, CRP> {
    if (!this.strategy.params) {
      this.strategy.params = {};
    }
    return this.strategy.params;
  }

  protected getRuntimeParams(): CommonStrategyParams<ORP, CRP> {
    if (!this._runtimeParams) {
      this._runtimeParams = _.merge({}, this.strategyParams) as any;
    }
    return this._runtimeParams;
  }

  protected getRuntimeParamsOf(orderTag: string) {
    const runtimeParams = this.getRuntimeParams();
    let rp = runtimeParams[orderTag];
    if (!rp) {
      rp = {};
      this._runtimeParams[orderTag] = rp;
    }
    return rp;
  }

  protected getOpenRuntimeParams(): ORP {
    return this.getRuntimeParamsOf(OrderTag.open);
  }

  protected getCloseRuntimeParams(): CRP {
    return this.getRuntimeParamsOf(OrderTag.close);
  }

  protected async closeDeal(deal: BacktestDeal): Promise<void> {
    await super.closeDeal(deal);

    this._runtimeParams = undefined;
  }
}
