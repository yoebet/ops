import * as Rx from 'rxjs';

export interface TestMessage1 {
  n: number;
  d: string;
  r: number;
}

export function testDataSource1(msInterval = 1000) {
  return Rx.interval(msInterval).pipe(
    Rx.map((n) => {
      const msg: TestMessage1 = {
        n,
        d: new Date().toISOString(),
        r: Math.random(),
      };
      return msg;
    }),
  );
}
