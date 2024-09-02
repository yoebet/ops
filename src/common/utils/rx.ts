import * as Rx from 'rxjs';
import { AppLogger } from '@/common/app-logger';

export interface WsResumeTimeoutParams {
  error: any;
  firstErrorTs: number;
  subject?: string;
}

export interface RetryOptions {
  logger?: AppLogger;
  subject?: string;
  // 最大重试次数，不指定则为无限次
  maxRetry?: number;
  // 初次重试间隔（毫秒）
  firstDelay?: number;
  // 最大重试间隔（毫秒）
  maxDelay?: number;
  // 重试间隔拉长指数，为 1（默认）则每次间隔相等
  delayExponent?: number;
  // 初次出错后，如果一段时间后尚未恢复，调用回调（retry会继续）
  resumeTimeout?: number;
  resumeTimeoutCallback?: (resumeTimeoutParams: WsResumeTimeoutParams) => void;
}

// 失败重试，可限定重试次数，也可让重试间隔一次次拉长。超过重试次数即终止；成功一次会清零计数
export function errorRetry<T>(
  options?: RetryOptions,
): Rx.MonoTypeOperatorFunction<T> {
  const {
    logger,
    subject,
    maxRetry,
    firstDelay = 50,
    maxDelay,
    delayExponent = 1,
    resumeTimeout,
    resumeTimeoutCallback,
  } = options || {};
  const logPrefix = subject ? `[${subject}]` : '';

  let firstErrorTs: number | undefined;

  return Rx.retry<T>({
    count: maxRetry,
    resetOnSuccess: true,
    delay: (err: any, retryCount: number) => {
      if (retryCount === 1 && err instanceof Error) {
        // log stack
        logger?.error(err, `${logPrefix} 发生错误了（#${retryCount}）：`);
      } else {
        logger?.error(
          `${logPrefix} 发生错误了（#${retryCount}）：${
            err?.message || 'Err.'
          }`,
        );
      }
      const now = Date.now();
      if (retryCount === 1) {
        firstErrorTs = now;
      } else {
        if (firstErrorTs && resumeTimeoutCallback && resumeTimeout) {
          if (now - firstErrorTs >= resumeTimeout) {
            resumeTimeoutCallback({ error: err, firstErrorTs, subject });
            firstErrorTs = undefined;
          }
        }
      }
      let ms =
        retryCount === 1 || delayExponent === 1
          ? firstDelay
          : firstDelay * Math.pow(delayExponent, retryCount - 1);
      if (maxDelay) {
        ms = Math.min(ms, maxDelay);
      }
      // logger?.debug(`${logPrefix} 下次重试：+${ms / 1000}s.`);
      return Rx.of(err).pipe(
        Rx.delay(ms),
        Rx.tap((_v) =>
          logger?.warn(`${logPrefix} 第 ${retryCount} 次重试 ...`),
        ),
      );
    },
  });
}

export function wrapOnNext<T>(options: {
  next: (value: T) => void;
  logger?: AppLogger;
  subject?: string;
}): Rx.Observer<T> {
  const { next, logger, subject } = options;
  const logPrefix = subject ? `[${subject}] ` : '';
  return {
    next,
    error: (err) => logger?.error(err, `${logPrefix} Rx 错误`),
    complete: () => {
      logger?.log(`${logPrefix} Rx 完成`);
    },
  };
}
