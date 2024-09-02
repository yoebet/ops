import { Observable } from 'rxjs';
import { PubSub } from 'graphql-subscriptions';

export function withCancel<T>(
  asyncIterator: AsyncIterator<T | undefined>,
  onCancel: () => void,
): AsyncIterator<T | undefined> {
  const retFn = asyncIterator.return?.bind(asyncIterator);
  asyncIterator.return = () => {
    onCancel();
    if (retFn) {
      return retFn();
    } else {
      return Promise.resolve({ value: undefined, done: true });
    }
  };
  return asyncIterator;
}

export function withObservable<T>(
  observable: Observable<T>,
  pubSub: PubSub,
  trigger: string,
): AsyncIterator<T | undefined> {
  const subscription = observable.subscribe(async (data) => {
    await pubSub.publish(trigger, {
      [trigger]: data,
    });
  });
  return withCancel(pubSub.asyncIterator(trigger), () => {
    subscription.unsubscribe();
  });
}

export const textToLines = (text: string): string[] => {
  if (text == null) {
    return [];
  }
  return text.replace(/"/g, "'").split('\n');
};

export const anyToLines = (data: any): string[] => {
  if (data == null) {
    return [];
  }
  if (typeof data === 'string') {
    return textToLines(data);
  }
  const text = JSON.stringify(data, null, 2);
  return textToLines(text);
};
