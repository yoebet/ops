import * as Rx from 'rxjs';
import { ExWs, ExWsParams, WsSymbolsChanges } from '@/exchange/base/ws/ex-ws';
import { SymbolParamSubject } from '@/exchange/base/ws/ex-ws-subjects';
import { mergeId } from '@/exchange/base/ws/base-ws';
import { ExWsComposite } from '@/exchange/base/ws/ex-ws-composite';

// 一个 subject运行多个实例（有些所限制了一个 ws连接上的订阅数）
export class MultipleInstanceSubject<T extends ExWs> extends ExWsComposite {
  private readonly underlying: (exWs: T) => SymbolParamSubject<any>;

  private symbolInstanceMap = new Map<string, number>();
  private theSubject: SymbolParamSubject<any>;

  constructor(
    params: ExWsParams,
    options: {
      count: number;
      newInstance: (params: Partial<ExWsParams>) => T;
      underlying: (exWs: T) => SymbolParamSubject<any>;
    },
  ) {
    super(params);
    const { count, newInstance, underlying } = options;
    this.underlying = underlying;

    for (let index = 1; index <= count; index++) {
      this.add(newInstance(mergeId({ instanceIndex: index }, params)));
    }
  }

  private counter = 0;

  // 把 symbol划分到不同实例
  private splitSymbols(
    symbols: string[],
    assign: boolean,
  ): Map<number, string[]> {
    const indexSymbolsMap = new Map<number, string[]>();
    const wsCount = this.wss.length;
    for (const symbol of symbols) {
      let index = this.symbolInstanceMap.get(symbol);
      if (index == null) {
        if (!assign) {
          continue;
        }
        index = this.counter % wsCount;
        this.symbolInstanceMap.set(symbol, index);
        this.counter++;
      }
      let symbols = indexSymbolsMap.get(index);
      if (!symbols) {
        symbols = [];
        indexSymbolsMap.set(index, symbols);
      }
      symbols.push(symbol);
    }
    return indexSymbolsMap;
  }

  getInstanceFor(symbol: string): T | undefined {
    const index = this.symbolInstanceMap.get(symbol);
    if (index == null) {
      return undefined;
    }
    return this.wss[index] as T;
  }

  // 把订阅分到多个实例
  protected compositeSubject(
    subjects: SymbolParamSubject<any>[],
  ): SymbolParamSubject<any> {
    const ws = this;
    return {
      subs(symbols: string[]) {
        const indexSymbolsMap = ws.splitSymbols(symbols, true);
        for (const [index, symbols] of indexSymbolsMap.entries()) {
          const subject = subjects[index];
          subject.subs(symbols);
        }
        return this;
      },
      unsubs(symbols: string[]) {
        const indexSymbolsMap = ws.splitSymbols(symbols, false);
        for (const [index, symbols] of indexSymbolsMap.entries()) {
          const subject = subjects[index];
          subject.unsubs(symbols);
        }
        return this;
      },
      get(): Rx.Observable<any> {
        return Rx.merge(...subjects.map((s) => s.get()));
      },
    };
  }

  getSubject(): SymbolParamSubject<any> {
    const subjects = this.wss.map(this.underlying);
    if (subjects.length === 1) {
      return subjects[0];
    }
    this.theSubject ||= this.compositeSubject(subjects);
    return this.theSubject;
  }

  notifySymbolsChanged(changes: WsSymbolsChanges) {
    const { added, removed } = changes;
    const subIndexSymbols = this.splitSymbols(added, true);
    const unsubIndexSymbols = this.splitSymbols(removed, false);
    for (let index = 0; index < this.wss.length; index++) {
      const ws = this.wss[index];
      ws.notifySymbolsChanged({
        added: subIndexSymbols.get(index) || [],
        removed: unsubIndexSymbols.get(index) || [],
      });
    }
  }
}
