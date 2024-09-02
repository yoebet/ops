import { Observable } from 'rxjs';

export interface SubjectHolder<T> {
  get(): Observable<T>;
}

// 订阅不需传参数
export interface NoParamSubject<T> extends SubjectHolder<T> {
  // subscribe
  subs(): this;

  // unsubscribe
  unsubs(): this;
}

// 订阅要传 symbol
export interface SymbolParamSubject<T> extends SubjectHolder<T> {
  // subscribe
  subs(symbols: string[]): this;

  // unsubscribe
  unsubs(symbols: string[]): this;
}
