export class ApiResult {
  constructor(
    public code: number = 0,
    public message?: string,
  ) {}

  static success(): ApiResult {
    return { code: 0 };
  }

  static fail(message: string): ApiResult {
    return { code: -1, message };
  }
}

export class ValueResult<T> extends ApiResult {
  value?: T;

  static value<VT>(v: VT): ValueResult<VT> {
    return { code: 0, value: v };
  }
}

export class ListResult<T> extends ApiResult {
  list?: T[];

  static list<S>(v: S[]): ListResult<S> {
    return { code: 0, list: v };
  }
}

export class CountListResult<T> extends ApiResult {
  countList?: CountList<T>;

  static cl<S>(countList: CountList<S>): CountListResult<S> {
    return { code: 0, countList };
  }
}

export interface CountList<T> {
  count: number;
  list: T[];
}
