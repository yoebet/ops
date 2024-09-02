import { WsCapacities } from '@/exchange/ws-capacities';
import { KuCoinWs } from '@/exchange/kucoin/kucoin-ws';
import {
  ExWsParams,
  WsChannelOp,
  WsSubscription,
} from '@/exchange/base/ws/ex-ws';
import { mergeId } from '@/exchange/base/ws/base-ws';
import { ExAccountCode } from '@/exchange/exchanges-types';
import { getTsNow } from '@/common/utils/utils';

export class KuCoinFuturesWs extends KuCoinWs implements WsCapacities {
  constructor(params: Partial<ExWsParams>) {
    super(mergeId({ entityCode: ExAccountCode.kucoinFutures }, params));
    this.exAccountCode = ExAccountCode.kucoinFutures;
  }

  protected async address(): Promise<string | URL> {
    return await this.getWSEndpoint(
      'https://api-futures.kucoin.com/api/v1/bullet-public',
    );
  }

  protected operateWsChannel(
    op: WsChannelOp,
    subscriptions: WsSubscription[],
  ): void {
    const opString = op === 'SUBSCRIBE' ? 'subscribe' : 'unsubscribe';
    const symbols = subscriptions.map((v) => {
      return v.symbol;
    });

    const request = {
      id: getTsNow(),
      type: opString,
      topic: '/contractMarket/execution:' + symbols.join(','),
      privateChannel: false,
      response: true,
    };

    this.sendJson(request);
  }

  protected async onMessageObj(obj: any): Promise<void> {
    if (
      !obj.type ||
      obj.type != 'message' ||
      !obj.subject ||
      obj.subject != 'match' ||
      !obj.data
    ) {
      return;
    }
    return await super.onMessageObj(obj);
  }
}
