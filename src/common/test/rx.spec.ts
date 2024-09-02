import * as Rx from 'rxjs';
import { errorRetry, wrapOnNext } from '@/common/utils/rx';
import { wait } from '@/common/utils/utils';
import { AppLogger } from '@/common/app-logger';

jest.setTimeout(1000_000);

function errSource(logger: AppLogger): Rx.Observable<any> {
  let cc = 0;
  return Rx.timer(0, 200).pipe(
    Rx.tap((v) => {
      cc++;
      logger.log(`emit #${cc}: ${v}`);
      // const err = v % 4 > 2;
      const err = Math.random() < 0.5;
      if (err) {
        throw new Error('' + v);
      }
    }),
  );
}

test('errorHandler', async () => {
  const logger = AppLogger.build('rx');
  const subject = 'eh';
  errSource(logger)
    .pipe(
      errorRetry({
        logger,
        subject,
        firstDelay: 1000,
        maxDelay: 10_000,
        delayExponent: 1.5,
      }),
    )
    .subscribe(
      wrapOnNext({
        next: (v) => {
          logger.log(`got ${v}`);
        },
        logger,
        subject,
      }),
    );

  await wait(1000_000);
});
