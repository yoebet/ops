import { OkxBaseWs } from '@/exchange/okx/okx-ws-base';
import { ExApiKey } from '@/exchange/base/rest/rest.type';
import {
  ExWsParams,
  WsChannelOp,
  WsSubscription,
} from '@/exchange/base/ws/ex-ws';
import { mergeId } from '@/exchange/base/ws/base-ws';
import { enc, HmacSHA256 } from 'crypto-js';
import {
  NoParamSubject,
  SymbolParamSubject,
} from '@/exchange/base/ws/ex-ws-subjects';
import {
  RestTypes,
  WsLivePosition,
  WsOrder,
  WsPosition,
  InstType,
  Balance,
} from '@/exchange/okx/types';

export class OkxWsPrivate extends OkxBaseWs {
  // #websocket-api-private-channel-account-channel
  protected static CHANNEL_ACCOUNT = 'account';
  // #websocket-api-private-channel-positions-channel
  protected static CHANNEL_LIVE_POSITION = 'positions';

  // #websocket-api-private-channel-balance-and-position-channel
  protected static CHANNEL_BALANCE_POSITION = 'balance_and_position';
  // #websocket-api-private-channel-order-channel
  protected static CHANNEL_ORDER = 'orders';

  protected static SUBJECT_BALANCE = 'balance';
  protected static SUBJECT_POSITION = 'position';

  // protected instType: InstType = 'MARGIN';

  constructor(
    private apiKey: ExApiKey,
    params?: Partial<ExWsParams>,
  ) {
    super(mergeId({ key: apiKey.key, keyLabel: apiKey.label }, params));
  }

  protected async address(): Promise<string> {
    return this.wsBaseUrl || `wss://wsaws.okx.com:8443/ws/v5/private`;
  }

  protected operateWsChannel(op: WsChannelOp, ss: WsSubscription[]): void {
    for (const s of ss) {
      const arg: any = {
        channel: s.channel,
      };
      if (
        s.channel === OkxWsPrivate.CHANNEL_LIVE_POSITION ||
        s.channel === OkxWsPrivate.CHANNEL_ORDER
      ) {
        arg.instType = s.symbol;
      } else if (s.channel === OkxWsPrivate.CHANNEL_ACCOUNT) {
        arg.ccy = s.symbol;
      }
      this.sendJson({
        op: op.toLowerCase(),
        args: [arg],
      });
    }
  }

  private sendAuth() {
    const epoch = '' + Math.round(Date.now() / 1000);
    const apiKey = this.apiKey;
    const sign = HmacSHA256(
      `${epoch}GET/users/self/verify`,
      apiKey.secret,
    ).toString(enc.Base64);
    const payload = {
      op: 'login',
      args: [
        {
          apiKey: apiKey.key,
          passphrase: apiKey.password,
          timestamp: epoch,
          sign,
        },
      ],
    };
    this.sendJson(payload);
  }

  protected async onWsReady(): Promise<void> {
    await super.onWsReady();
    this.sendAuth();
  }

  protected async onMessageObj(obj: any): Promise<void> {
    const event: string = obj.event;
    if (event === 'login') {
      if (obj.code === '0') {
        this.logger?.log('认证完成');
        this.subscriptionReady();
      } else {
        this.logError(obj, 'onMessageObj');
      }
      return;
    }
    if (event === 'error') {
      this.logError(obj, 'onMessageObj');
      return;
    }
    if (event === 'subscribe' || event === 'unsubscribe') {
      return;
    }

    const channel: string = obj.arg?.channel;
    if (!channel || !obj.data) {
      return;
    }

    if (channel === OkxWsPrivate.CHANNEL_ACCOUNT) {
      this.publishMessage(OkxWsPrivate.CHANNEL_ACCOUNT, obj.data);
      return;
    }
    if (channel === OkxWsPrivate.CHANNEL_BALANCE_POSITION) {
      const data = obj.data[0];
      if (data.balData) {
        this.publishMessage(OkxWsPrivate.SUBJECT_BALANCE, data.balData);
      }
      if (data.posData) {
        this.publishMessage(OkxWsPrivate.SUBJECT_POSITION, data.posData);
      }
      // 事件类型 eventType
      // snapshot：首推快照
      // delivered：交割
      // exercised：行权
      // transferred：划转
      // filled：成交
      // liquidation：强平
      // claw_back：穿仓补偿
      // adl：ADL自动减仓
      // funding_fee：资金费
      // adjust_margin：调整保证金
      // set_leverage：设置杠杆
      // interest_deduction：扣息
      // const isSnapshot = data.eventType === 'snapshot';
      return;
    }

    if (channel === OkxWsPrivate.CHANNEL_LIVE_POSITION) {
      // 约 5秒推一次
      const data = obj.data;
      this.publishMessage(OkxWsPrivate.CHANNEL_LIVE_POSITION, data);
      return;
    }

    if (channel === OkxWsPrivate.CHANNEL_ORDER) {
      const orders: WsOrder[] = obj.data;
      this.publishMessage(OkxWsPrivate.CHANNEL_ORDER, orders);
    }
  }

  liveBalanceSubject(): SymbolParamSubject<Balance> {
    return this.symbolParamSubject<Balance>(OkxWsPrivate.CHANNEL_ACCOUNT);
  }

  balanceSubject(): NoParamSubject<{
    ccy: string;
    cashBal: number;
    uTime: string;
  }> {
    return this.noParamSubject(
      OkxWsPrivate.CHANNEL_BALANCE_POSITION,
      OkxWsPrivate.SUBJECT_BALANCE,
    );
  }

  positionSubject(): NoParamSubject<WsLivePosition> {
    return this.noParamSubject(
      OkxWsPrivate.CHANNEL_BALANCE_POSITION,
      OkxWsPrivate.SUBJECT_POSITION,
    );
  }

  livePositionSubject(): SymbolParamSubject<WsLivePosition> {
    return this.symbolParamSubject(OkxWsPrivate.CHANNEL_LIVE_POSITION);
  }

  orderSubject(): SymbolParamSubject<WsOrder> {
    return this.symbolParamSubject(OkxWsPrivate.CHANNEL_ORDER);
  }
}
