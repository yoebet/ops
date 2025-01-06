import { OkxRest } from '@/exchange/okx/rest';
import {
  AssetItem,
  ExchangeTradeService,
  PlaceOrderParams,
  PlaceOrderReturns,
  PlaceTpslOrderParams,
  SyncOrder,
  AccountAsset,
} from '@/exchange/exchange-service.types';
import { ExApiKey, ExRestParams } from '@/exchange/base/rest/rest.type';
import {
  BalanceDetail,
  CreateAlgoOrderParams,
  CreateOrderParams,
  OrderAlgoParams,
  RestTypes,
} from '@/exchange/okx/types';
import { ExOrderResp, OrderStatus } from '@/db/models/ex-order';
import { AppLogger } from '@/common/app-logger';

export class OkxTradeBase implements ExchangeTradeService {
  protected rest: OkxRest;
  protected tradeMode: RestTypes['TradeMode'] = 'cash';
  protected readonly logger: AppLogger;

  constructor(params?: Partial<ExRestParams>) {
    this.rest = new OkxRest(params);
    this.logger = params.logger || AppLogger.build(this.constructor.name);
  }

  static mapOrderResp(exo: RestTypes['Order'], logger: AppLogger): ExOrderResp {
    let status: OrderStatus;
    if (!exo.state) {
      status = OrderStatus.pending;
    } else {
      switch (exo.state) {
        case 'canceled':
        case 'mmp_canceled':
          status = OrderStatus.canceled;
          break;
        case 'live':
          status = OrderStatus.pending;
          break;
        case 'partially_filled':
          status = OrderStatus.partialFilled;
          break;
        case 'filled':
          status = OrderStatus.filled;
          break;
        default:
          status = exo.state as any;
          logger.error(`unknown order state: ${exo.state}`);
      }
    }
    const exor: ExOrderResp = {
      exOrderId: exo.ordId,
      clientOrderId: exo.clOrdId,
      status,
    };
    if (exo.avgPx != null) {
      exor.execPrice = +exo.avgPx;
    }
    if (exo.accFillSz != null) {
      exor.execSize = +exo.accFillSz;
    }
    if (exor.execPrice && exor.execSize) {
      exor.execAmount = exor.execSize * exor.execPrice;
    }
    if (exo.cTime) {
      exor.exCreatedAt = new Date(+exo.cTime);
    }
    if (exo.uTime) {
      exor.exUpdatedAt = new Date(+exo.uTime);
    }
    exor.rawOrder = exo;
    return exor;
  }

  async placeTpslOrder(
    apiKey: ExApiKey,
    params: PlaceTpslOrderParams,
  ): Promise<PlaceOrderReturns> {
    const op: CreateAlgoOrderParams = {
      algoClOrdId: params.clientOrderId,
      instId: params.symbol,
      side: params.side,
      sz: params.baseSize,
      tdMode: this.tradeMode,
      // posSide: params.posSide,
      ccy: params.marginMode === 'cross' ? params.marginCoin : undefined,
      reduceOnly: !!params.reduceOnly,
      ordType: 'conditional',
    };

    if (
      params.tpslType === 'tp' ||
      params.tpslType === 'sl' ||
      params.tpslType === 'tpsl'
    ) {
      const biDirection = params.tpslType === 'tpsl';
      if (biDirection) {
        op.ordType = 'oco';
      }
      if (params.tpslType === 'tp' || params.tpslType === 'tpsl') {
        op.tpTriggerPx = params.tpTriggerPrice;
        op.tpOrdPx = params.tpOrderPrice;
        // tpOrdKind
      }
      if (params.tpslType === 'sl' || params.tpslType === 'tpsl') {
        op.slTriggerPx = params.slTriggerPrice;
        op.slOrdPx = params.slOrderPrice;
      }
    } else if (params.tpslType === 'move') {
      op.ordType = 'move_order_stop';
      op.callbackRatio = params.moveDrawbackRatio;
      op.activePx = params.moveActivePrice;
    } else {
      throw new Error('unsupported ordType');
    }

    this.logger.log(op);
    const result = await this.rest.createAlgoOrder(apiKey, op);
    this.logger.log(result);
    return {
      rawParams: op,
      orderResp: OkxTradeBase.mapOrderResp(result as any, this.logger),
    };
  }

  async placeOrder(
    apiKey: ExApiKey,
    params: PlaceOrderParams,
  ): Promise<PlaceOrderReturns> {
    if (this.tradeMode !== 'cash' && !params.marginMode) {
      throw new Error(`missing marginMode`);
    }

    if (!params.baseSize && !params.quoteAmount) {
      throw new Error(`missing size`);
    }
    let type: RestTypes['Order']['ordType'] = params.priceType;
    if (params.timeType) {
      if (params.timeType === 'gtc') {
        type = 'post_only';
      } else if (params.timeType === 'fok' || params.timeType === 'ioc') {
        type = params.timeType;
      }
    }
    const op: CreateOrderParams = {
      clOrdId: params.clientOrderId,
      instId: params.symbol,
      ordType: type,
      px: params.price,
      side: params.side,
      sz: params.baseSize,
      tdMode: this.tradeMode,
      // posSide: params.posSide,
      ccy: params.marginMode === 'cross' ? params.marginCoin : undefined,
      reduceOnly: !!params.reduceOnly,
    };
    if (this.tradeMode === 'cash' && type === 'market') {
      if (params.quoteAmount) {
        op.sz = params.quoteAmount;
        op.tgtCcy = 'quote_ccy';
      } else {
        op.tgtCcy = 'base_ccy';
      }
    }
    if (!op.sz) {
      throw new Error(`missing size`);
    }

    if (params.tpslType) {
      const alp: OrderAlgoParams = {
        attachAlgoClOrdId: params.tpslClientOrderId,
      };
      if (params.tpslType === 'tp' || params.tpslType === 'tpsl') {
        alp.tpTriggerPx = params.tpTriggerPrice;
        alp.tpOrdPx = params.tpOrderPrice;
      }
      if (params.tpslType === 'sl' || params.tpslType === 'tpsl') {
        alp.slTriggerPx = params.slTriggerPrice;
        alp.slOrdPx = params.slOrderPrice;
      }
      op.attachAlgoOrds = [alp];
    }

    this.logger.log(op);

    const result = await this.rest.createOrder(apiKey, op);
    this.logger.log(result);
    return {
      rawParams: op,
      orderResp: OkxTradeBase.mapOrderResp(result as any, this.logger),
    };
  }

  async cancelOrder(
    apiKey: ExApiKey,
    params: {
      symbol: string;
      orderId: string;
      algoOrder?: boolean;
    },
  ): Promise<any> {
    if (params.algoOrder) {
      return this.rest.cancelAlgoOrder(apiKey, {
        instId: params.symbol,
        algoId: params.orderId,
      });
    }
    return this.rest.cancelOrder(apiKey, {
      instId: params.symbol,
      ordId: params.orderId,
    });
  }

  async cancelBatchOrders(
    apiKey: ExApiKey,
    params: { symbol: string; orderId: string }[],
  ): Promise<any[]> {
    return this.rest.cancelBatchOrders(
      apiKey,
      params.map((s) => ({ instId: s.symbol, ordId: s.orderId })),
    );
  }

  async cancelOrdersBySymbol(
    _apiKey: ExApiKey,
    _params: { symbol: string },
  ): Promise<any> {
    // return this.rest.cancelBatchOrders()
    throw new Error(`not supported`);
  }

  async getAllOpenOrders(
    apiKey: ExApiKey,
    _params: { margin: boolean },
  ): Promise<SyncOrder[]> {
    const ros = await this.rest.getOpenOrders(apiKey, {});
    return ros.map((o) => OkxTradeBase.mapOrderResp(o, this.logger));
  }

  async getOpenOrdersBySymbol(
    apiKey: ExApiKey,
    params: { symbol: string },
  ): Promise<SyncOrder[]> {
    const ros = await this.rest.getOpenOrders(apiKey, {
      instId: params.symbol,
    });
    return ros.map((o) => OkxTradeBase.mapOrderResp(o, this.logger));
  }

  async getOrder(
    apiKey: ExApiKey,
    params: {
      symbol: string;
      orderId: string;
      algoOrder?: boolean;
    },
  ): Promise<SyncOrder | undefined> {
    let ro: RestTypes['Order'];
    if (params.algoOrder) {
      ro = await this.rest.getAlgoOrder(apiKey, {
        algoId: params.orderId,
      });
    } else {
      ro = await this.rest.getOrder(apiKey, {
        instId: params.symbol,
        ordId: params.orderId,
      });
    }
    if (!ro) {
      return undefined;
    }
    return OkxTradeBase.mapOrderResp(ro as any, this.logger);
  }

  async getAllOrders(
    apiKey: ExApiKey,
    params: {
      symbol: string;
      // isIsolated?: boolean;
      // 如设置 orderId , 订单量将 >= orderId。否则将返回最新订单。
      // equalAndAfterOrderId?: number;
      startTime?: number;
      endTime?: number;
      limit?: number;
    },
  ): Promise<SyncOrder[]> {
    const ros = await this.rest.getClosedOrders(apiKey, {
      instType: this.tradeMode === 'cash' ? 'SPOT' : 'MARGIN',
      instId: params.symbol,
      // before: params.equalAndAfterOrderId,
      begin: params.startTime,
      end: params.endTime,
      limit: params.limit,
    });
    return ros.map((o) => OkxTradeBase.mapOrderResp(o, this.logger));
  }

  async getMaxAvailableSize(
    apiKey: ExApiKey,
    params: {
      symbols: string[];

      // tdMode: RestTypes['TradeMode'];
      marginCoin?: string; // 保证金币种，仅适用于单币种保证金模式下的全仓杠杆订单
      reduceOnly?: boolean; // 是否为只减仓模式，仅适用于币币杠杆
      // px?: string; // 委托价格
    },
  ): Promise<
    {
      symbol: string;
      availBuy: string; // 最大可买的交易币数量
      availSell: string; // 最大可卖的计价币数量
    }[]
  > {
    const mas = await this.rest.getMaxAvailableSize(apiKey, {
      instId: params.symbols.join(','),
      tdMode: this.tradeMode,
      ccy: params.marginCoin,
      reduceOnly: params.reduceOnly,
    });
    return mas.map((m) => ({
      symbol: m.instId,
      availBuy: m.availBuy,
      availSell: m.availSell,
    }));
  }

  private mapAssetItem(a: BalanceDetail): AssetItem {
    return {
      coin: a.ccy,
      eq: +a.eq,
      eqUsd: +a.eqUsd,
      frozenBal: +a.frozenBal,
      ordFrozen: +a.ordFrozen,
      availBal: +a.availBal,
    };
  }

  async getAccountBalance(apiKey: ExApiKey): Promise<AccountAsset> {
    const bals = await this.rest.getBalances(apiKey);
    return {
      totalEqUsd: +bals.totalEq,
      timestamp: +bals.uTime,
      coinAssets: bals.details.map(this.mapAssetItem),
    };
  }

  async getAccountCoinBalance(
    apiKey: ExApiKey,
    params: { coin: string },
  ): Promise<AssetItem> {
    const bals = await this.rest.getBalances(apiKey, { ccy: params.coin });
    const ci = bals.details.filter((a) => a.ccy === params.coin);
    if (ci.length === 0) {
      throw new Error(`no balance for coin: ${params.coin}`);
    }
    return this.mapAssetItem(ci[0]);
  }

  async getPositions(apiKey: ExApiKey): Promise<any[]> {
    return this.rest.getPositions(apiKey, {
      instType: 'MARGIN',
    });
  }
}
