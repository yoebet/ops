import * as _ from 'lodash';
import {
  ConsiderSide,
  PressureCheckerParams,
  TradeOpportunity,
} from '@/strategy/strategy.types';
import { TimeLevel } from '@/db/models/time-level';
import { wait } from '@/common/utils/utils';
import { TradeSide } from '@/data-service/models/base';
import { BaseRunner } from '@/strategy/strategy/base-runner';
import { AppLogger } from '@/common/app-logger';
import { FtKline } from '@/data-service/models/kline';
import { evalTargetPrice } from '@/strategy/opportunity/helper';

export function checkPressure(
  this: { logger: AppLogger },
  klines: FtKline[],
  params: PressureCheckerParams,
  side: TradeSide,
  info: string[],
): { orderPrice: number } | undefined {
  const {
    hitDeltaPercent,
    hitTimes,
    placeOrderDeltaPercent,
    orderPriceDeltaPercent,
  } = params;
  const isBuy = side === TradeSide.buy;
  const otherSide = isBuy ? TradeSide.sell : TradeSide.buy;
  const mKl = isBuy ? _.minBy(klines, 'low') : _.maxBy(klines, 'high');
  const mm = TradeSide.buy ? mKl.close : mKl.high;
  const threshold = evalTargetPrice(mm, hitDeltaPercent, otherSide);
  const count = klines.filter((k) =>
    isBuy ? k.low <= threshold : k.high >= threshold,
  ).length;
  if (count < hitTimes) {
    return undefined;
  }

  const placeOrderPrice = evalTargetPrice(
    mm,
    placeOrderDeltaPercent,
    otherSide,
  );
  const last = klines[klines.length - 1];
  const latestPrice = last.close;
  const placeOrder = isBuy
    ? latestPrice <= placeOrderPrice
    : latestPrice >= placeOrderPrice;

  if (!placeOrder) {
    return undefined;
  }
  const orderPrice = evalTargetPrice(mm, orderPriceDeltaPercent, otherSide);
  const mms = mm.toPrecision(6);
  const pops = placeOrderPrice.toPrecision(6);
  const ops = orderPrice.toPrecision(6);
  info.push(
    `${isBuy ? 'min' : 'max'}: ${mms}, place order at: ${pops}, order price: ${ops}`,
  );
  return { orderPrice };
}

export async function checkPressureOpp(
  this: BaseRunner,
  params: PressureCheckerParams,
  considerSide: ConsiderSide,
  oppor?: Partial<TradeOpportunity>,
): Promise<TradeOpportunity | undefined> {
  if (considerSide !== 'both') {
    return checkPressureOppOneSide.call(this, params, considerSide, oppor);
  }
  return Promise.race([
    checkPressureOppOneSide.call(this, { ...params }, TradeSide.buy, oppor),
    checkPressureOppOneSide.call(this, { ...params }, TradeSide.sell, oppor),
  ]);
}

export async function checkPressureOppOneSide(
  this: BaseRunner,
  params: PressureCheckerParams,
  side: TradeSide,
  oppor?: Partial<TradeOpportunity>,
): Promise<TradeOpportunity | undefined> {
  const { interval, periods, cancelOrderPricePercent } = params;

  const klines = await this.env.getLatestKlines({
    interval,
    limit: periods,
  });

  const info: string[] = [];
  const result = checkPressure.call(this, klines, params, side, info);
  if (!result) {
    await this.logJob(`quiet, wait ${interval}`);
    const intervalSeconds = TimeLevel.evalIntervalSeconds(interval);
    await wait(intervalSeconds * 1000);
    return undefined;
  }

  const orderPrice = result.orderPrice;

  const oppo: TradeOpportunity = {
    ...oppor,
    side,
    orderPrice,
    memo: info.join('\n'),
  };
  await this.buildLimitOrder(oppo);
  if (oppo.order) {
    oppo.order.cancelPrice = evalTargetPrice(
      orderPrice,
      cancelOrderPricePercent || 1.0,
      side,
    );
  }
  return oppo;
}
