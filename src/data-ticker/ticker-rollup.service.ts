import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataChannelService } from '@/data-service/data-channel.service';
import { AppLogger } from '@/common/app-logger';
import { TickerProducerService } from '@/data-ticker/ticker-producer.service';
import { Trade1 } from '@/data-service/models/trade1';
import { RtFpKline, RtKline } from '@/data-service/models/realtime';
import { Footprint1 } from '@/data-service/models/base';
import { TradeSide } from '@/db/models-data/base';
import { TimeLevel } from '@/db/models/time-level';
import { SymbolConfig } from '@/db/models/symbol-config';
import { ExchangeCode } from '@/exchange/exchanges-types';

interface RollupData {
  ts: number;
  createTs: number;
  moveToRd2Ts?: number;
  kl: RtKline;
  // prl -> pl -> fp
  prlFps: Map<number, Map<string, Footprint1>>;
}

interface ExSymbolRollup {
  key: string; // ex_symbol
  symbol: string;
  ex: string;
  base: string;
  quote: string;
  interval: string;
  lastPublishTs?: number;
  rd2?: RollupData;
  rd1?: RollupData; // newer
}

interface SymbolTickConfig {
  ss: SymbolConfig;
  priceTick: number;
  priceTickDecimalDigits: number;
}

@Injectable()
export class TickerRollupService implements OnModuleInit {
  interval = '1s';
  // symbol-ex -> rollup
  private rollup1sMap = new Map<string, ExSymbolRollup>();
  // ex-market -> rollup[]
  private exMarketRollup1sMap = new Map<string, ExSymbolRollup[]>();

  private timeLevel: TimeLevel;
  private symbolConfigMap: Map<string, SymbolTickConfig>;

  private counterStartTs = 0;
  private publishKlCount = 0;
  private publishFpklCount = 0;

  constructor(
    readonly tickerService: TickerProducerService,
    readonly channelService: DataChannelService,
    readonly logger: AppLogger,
  ) {
    logger.setContext('ticker-rollup');
  }

  async onModuleInit() {
    this.timeLevel = await TimeLevel.findOneBy({ interval: this.interval });
    if (!this.timeLevel) {
      this.logger.error(`time level ${this.interval} not found.`);
      return;
    }
    const ss = await SymbolConfig.find();
    this.symbolConfigMap = new Map<string, SymbolTickConfig>(
      ss.map((s) => [
        s.symbol,
        {
          ss: s,
          priceTick: +s.priceTickStr,
          priceTickDecimalDigits:
            s.priceTickStr.length - s.priceTickStr.indexOf('.') + 1,
        },
      ]),
    );
    setInterval(this.checkStayAndPublish.bind(this), 1000);
    this.tickerService.addTradeTap('rollup', this.onTrade.bind(this));
    this.counterStartTs = Date.now();
  }

  private getWaitingAfterMoveToRd2(ex: ExchangeCode): number {
    return 500;
  }

  private getWaitingAfterCreate(ex: ExchangeCode) {
    return 1200;
  }

  private async checkStayAndPublish() {
    if (this.rollup1sMap.size === 0) {
      return;
    }
    let now = Date.now();
    let published = 0;
    for (const ru of this.rollup1sMap.values()) {
      const wms = this.getWaitingAfterCreate(ru.ex as ExchangeCode);
      if (ru.rd2 && now - ru.rd2.createTs > wms) {
        // this.logger.debug(`publish (3.1) ...`, ru.key);
        await this.publish(ru, 'rd2');
        published++;
      }
      if (!ru.rd2 && ru.rd1 && now - ru.rd1.createTs > wms) {
        // this.logger.debug(`publish (3.2) ...`, ru.key);
        await this.publish(ru, 'rd1');
        published++;
      }
    }
    if (published > 0) {
      // this.logger.debug(`published (3): ${published}`);
      now = Date.now();
    }
    const klc = this.publishKlCount;
    if (klc > 0) {
      if (klc >= 1000 || now - this.counterStartTs > 60_000) {
        this.logger.debug(
          `published kl: ${klc}, fpkl: ${this.publishFpklCount}`,
        );
        this.publishKlCount = 0;
        this.publishFpklCount = 0;
        this.counterStartTs = now;
      }
    }
  }

  private appendTradeKline(kl: RtKline, trade: Trade1) {
    const { size, amount, price } = trade;
    kl.size += size;
    kl.amount += amount;
    if (trade.side === TradeSide.buy) {
      kl.bs += size;
      kl.ba += amount;
    } else {
      kl.ss += size;
      kl.sa += amount;
    }
    if (kl.tds === 0) {
      kl.open = price;
      kl.high = price;
      kl.low = price;
    } else {
      if (kl.high < price) {
        kl.high = price;
      }
      if (kl.low > price) {
        kl.low = price;
      }
    }
    kl.close = price;
    kl.tds++;
  }

  private appendTradeFps(
    prlFps: Map<number, Map<string, Footprint1>>,
    trade: Trade1,
  ) {
    const { prlFrom, prlTo } = this.timeLevel;
    const tickConfig = this.symbolConfigMap.get(trade.symbol);
    if (!tickConfig) {
      return;
    }
    const { priceTick: pt, priceTickDecimalDigits: digits } = tickConfig;
    const { side, size, amount, price } = trade;

    for (let prl = prlFrom; prl <= prlTo; prl *= 2) {
      let fps = prlFps.get(prl);
      if (!fps) {
        fps = new Map<string, Footprint1>();
        prlFps.set(prl, fps);
      }
      const step = prl * pt;
      const pls = (Math.floor(price / step) * step).toFixed(digits);
      const pl = +pls;
      const pu = pl + step;
      let fp = fps.get(pls);
      if (!fp) {
        fp = {
          pl,
          pu,
          prl,
          ba: 0,
          bs: 0,
          sa: 0,
          ss: 0,
          tds: 0,
        };
        fps.set(pls, fp);
      }
      if (side === TradeSide.buy) {
        fp.bs += size;
        fp.ba += amount;
      } else {
        fp.ss += size;
        fp.sa += amount;
      }
      fp.tds++;
    }
  }

  private newKline(trade: Trade1, ts: number, interval: string): RtKline {
    return {
      ts,
      interval,
      ex: trade.ex,
      symbol: trade.symbol,
      amount: 0,
      ba: 0,
      bs: 0,
      close: 0,
      high: 0,
      low: 0,
      open: 0,
      sa: 0,
      size: 0,
      ss: 0,
      tds: 0,
    };
  }

  private async onTrade(trade: Trade1) {
    const key = `${trade.ex}_${trade.symbol}`;
    const emKey = `${trade.ex}_${trade.market}`;
    let ts = trade.time.getTime();
    ts = ts - (ts % (this.timeLevel.intervalSeconds * 1000));
    let ru: ExSymbolRollup = this.rollup1sMap.get(key);
    if (!ru) {
      ru = {
        key,
        ex: trade.ex,
        symbol: trade.symbol,
        base: trade.base,
        quote: trade.quote,
        interval: this.interval,
      };
      this.rollup1sMap.set(key, ru);
      let rus = this.exMarketRollup1sMap.get(emKey);
      if (!rus) {
        rus = [];
        this.exMarketRollup1sMap.set(emKey, []);
      }
      rus.push(ru);
    }

    if (ru.lastPublishTs && ts <= ru.lastPublishTs) {
      this.logger.debug(`late coming (1): ${key}.`);
      return;
    }
    if (ru.rd2 && ts < ru.rd2.ts) {
      if (ru.rd1) {
        this.logger.debug(`late coming (2): ${key}.`);
        return;
      }
      ru.rd1 = ru.rd2;
      ru.rd1.moveToRd2Ts = undefined;
      ru.rd2 = undefined;
      await this.appendTrade(ru, trade, ts, 'rd2');
      return;
    }

    if (ru.rd1) {
      if (ts === ru.rd1.ts) {
        await this.appendTrade(ru, trade, ts, 'rd1');
        return;
      }
      // ts !== ru.rd1.ts
      if (ts > ru.rd1.ts) {
        if (ru.rd2) {
          // rd1/rd2
          // this.logger.debug(`publish rd2, 1: ${key}.`);
          await this.publish(ru, 'rd2');
        }
        const ms = this.getWaitingAfterMoveToRd2(trade.ex as ExchangeCode);
        if (ms === 0) {
          await this.publish(ru, 'rd1');
          await this.appendTrade(ru, trade, ts, 'rd1');
          return;
        }
        ru.rd2 = ru.rd1;
        ru.rd1 = undefined;
        ru.rd2.moveToRd2Ts = Date.now();
        // this.logger.debug(`1 -> 2: ${key}.`);
        await this.appendTrade(ru, trade, ts, 'rd1');
        return;
      }
      // ts < ru.rd1.ts
      if (ru.rd2) {
        if (ts === ru.rd2.ts) {
          // this.logger.debug(`rd2: ${key}.`);
          await this.appendTrade(ru, trade, ts, 'rd2');
          return;
        }
        // ts > ru.rd2.ts
        // this.logger.debug(`publish rd2, 2: ${key}.`);
        await this.publish(ru, 'rd2');
        await this.appendTrade(ru, trade, ts, 'rd2');
        return;
      }
      // no rd2
      // this.logger.debug(`+rd2: ${key}.`);
      await this.appendTrade(ru, trade, ts, 'rd2');
      return;
    }

    // no rd1
    if (ru.rd2) {
      if (ts === ru.rd2.ts) {
        await this.appendTrade(ru, trade, ts, 'rd2');
        return;
      }
      // ts > ru.rd2.ts
      this.logger.debug(`-> rd1: ${key}.`);
      await this.appendTrade(ru, trade, ts, 'rd1');
      return;
    }

    // no rd1/rd2
    // this.logger.debug(`+rd1: ${key}.`);
    await this.appendTrade(ru, trade, ts, 'rd1');
  }

  private async appendTrade(
    ru: ExSymbolRollup,
    trade: Trade1,
    ts: number,
    rk: 'rd1' | 'rd2',
  ) {
    const now = Date.now();
    if (ru[rk]) {
      if (ru[rk].ts !== ts) {
        this.logger.warn(`wrong ts`);
      }
    } else {
      ru[rk] = {
        ts,
        createTs: now,
        kl: this.newKline(trade, ts, this.interval),
        prlFps: new Map<number, Map<string, Footprint1>>(),
      };
    }

    this.appendTradeKline(ru[rk].kl, trade);

    this.appendTradeFps(ru[rk].prlFps, trade);

    if (rk === 'rd1') {
      if (ru.rd2 && ru.rd2.moveToRd2Ts) {
        const ms = this.getWaitingAfterMoveToRd2(trade.ex as ExchangeCode);
        if (now - ru.rd2.moveToRd2Ts > ms) {
          // this.logger.debug(`publish rd2, after waiting: ${ru.key}.`);
          await this.publish(ru, 'rd2');
        }
      }
    }
  }

  private async publish(rollup: ExSymbolRollup, rk: 'rd1' | 'rd2') {
    const { base, interval, key } = rollup;
    const rud = rollup[rk];
    if (!rud) {
      return;
    }
    const { kl, prlFps, ts } = rud;

    const klProducer =
      await this.channelService.getKlineProducer('publish-kline');
    const klTopic = this.channelService.getKlineTopic(base, interval);
    await klProducer.produce(klTopic, kl);
    this.publishKlCount++;

    const fpklProducer =
      await this.channelService.getFpKlineProducer('publish-footprint');

    const fpkl: RtFpKline = {
      ...kl,
      prl: 1,
      fps: [],
    };

    for (const [prl, fpsMap] of prlFps.entries()) {
      fpkl.prl = prl;
      fpkl.fps = [...fpsMap.values()].sort((fp1, fp2) => fp1.pl - fp2.pl);

      const fpklTopic = this.channelService.getFpKlineTopic(
        base,
        interval,
        prl,
      );
      await fpklProducer.produce(fpklTopic, fpkl);
      this.publishFpklCount++;
    }

    if (rollup[rk] === rud) {
      rollup.lastPublishTs = ts;
      rollup[rk] = undefined;
    }
  }
}
