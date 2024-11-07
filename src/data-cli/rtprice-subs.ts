import { Observable, Observer, Subscription } from 'rxjs';
import { OflowDataChannel, TickerDataScope } from './commands';
import { DataSource } from './data-source';
import { DEFAULT_TICKET_THROTTLE, UNSUB_DELAY_MS } from '@/data-cli/constants';
import { buildDataScopeExSymbol } from '@/data-cli/multiple-markets';
import { RtPrice } from '@/data-service/models/realtime';

export interface PriceSubs {
  scopeKey: string;
  scope: TickerDataScope;

  subscribe(
    observerOrNext?: Partial<Observer<RtPrice>> | ((value: RtPrice) => void),
  ): void;

  discard(): void;
}

interface SubsInternal {
  scopeKey: string;
  scope: TickerDataScope;
  obs: Observable<RtPrice>;
  subIds: Set<number>;
  aboutToUnsub?: boolean;
}

let cliId = 1;

export class RtPriceSubs {
  // scopeKey ->
  protected priceSubsMap: Map<string, SubsInternal>;

  constructor(protected dataSource: DataSource) {
    this.priceSubsMap = new Map<string, SubsInternal>();
    this.dataSource.getConnectionSubject().subscribe(async (ce) => {
      if (ce.event === 'connect') {
        await this.onDatasourceConnected();
      } else if (ce.event === 'disconnect') {
        this.onDatasourceDisconnected();
      }
    });
  }

  protected get debug(): boolean {
    return this.dataSource.debug;
  }

  protected async onDatasourceConnected() {
    if (this.priceSubsMap.size === 0) {
      return;
    }
    const ps = [...this.priceSubsMap.values()].map((subs) => {
      const { scope, scopeKey, aboutToUnsub } = subs;
      if (this.debug) {
        console.log(
          `\treconnect: ${scopeKey}, ${aboutToUnsub ? 'about to unsub' : ''}`,
        );
      }
      return this.dataSource.reSubscribeTicker(scope);
    });
    await Promise.all(ps);
  }

  protected onDatasourceDisconnected() {
    if (this.debug) {
      this.priceSubsMap.forEach((subs) => {
        const { scopeKey, aboutToUnsub } = subs;
        console.log(
          `\tdisconnect: ${scopeKey}, ${aboutToUnsub ? 'about to unsub' : ''}`,
        );
      });
    }
  }

  static getScopeKey(scope: TickerDataScope): string {
    return `${scope.ex}:${scope.symbol}`;
  }

  async subsData(scope: TickerDataScope): Promise<PriceSubs> {
    const scopeKey = RtPriceSubs.getScopeKey(scope);
    let priceSubs = this.priceSubsMap.get(scopeKey);

    if (!priceSubs) {
      const tickerParams: TickerDataScope = scope.exSymbols
        ? buildDataScopeExSymbol(scope.exSymbols)
        : {
            ex: scope.ex,
            symbol: scope.symbol,
          };
      tickerParams.baseCoin = scope.baseCoin;
      tickerParams.throttle = DEFAULT_TICKET_THROTTLE;
      const obs = this.dataSource.subscribeTicker(tickerParams);
      priceSubs = {
        scopeKey,
        scope: tickerParams,
        obs,
        aboutToUnsub: false,
        subIds: new Set(),
      };
      this.priceSubsMap.set(scopeKey, priceSubs);
    }

    cliId++;

    const obs = priceSubs.obs;
    let sub: Subscription;

    const subscribe = (
      observerOrNext?: Partial<Observer<RtPrice>> | ((value: RtPrice) => void),
    ) => {
      sub = obs.subscribe(observerOrNext);
    };
    const discard = () => {
      sub?.unsubscribe();
      this.discard(scopeKey, cliId);
    };

    priceSubs.aboutToUnsub = false;
    const cliSub: PriceSubs = {
      scopeKey: priceSubs.scopeKey,
      scope,
      subscribe,
      discard,
    };
    priceSubs.subIds.add(cliId);

    return cliSub;
  }

  protected discard(scopeKey: string, cliId: number) {
    const underlying = this.priceSubsMap.get(scopeKey);
    if (!underlying) {
      return;
    }
    underlying.subIds.delete(cliId);
    if (underlying.subIds.size > 0) {
      return;
    }
    underlying.aboutToUnsub = true;
    setTimeout(async () => {
      const underlying = this.priceSubsMap.get(scopeKey);
      if (!underlying) {
        return;
      }
      if (!underlying.aboutToUnsub) {
        return;
      }
      await this.dataSource.unsubscribe(
        OflowDataChannel.ticker,
        underlying.scope,
      );
      underlying.aboutToUnsub = false;
      this.priceSubsMap.delete(scopeKey);
    }, UNSUB_DELAY_MS);
  }
}
