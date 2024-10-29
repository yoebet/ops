import { isArray, isPlainObject, mergeWith } from 'lodash';

it('merge', async () => {
  function mergeConfig(obj: any, source: any) {
    return mergeWith(obj, source, (objValue, srcValue) => {
      if (isArray(srcValue)) {
        return srcValue;
      }
    });
  }

  const obj = { bullmq: { redis: { db: 1, o: { a: 1 } } } };
  const source = {
    bullmq: { redis: { host: 'localhost', port: 26379, o: { a: 3, b: 2 } } },
  };

  const t = mergeConfig(obj, source);
  console.log(JSON.stringify(t, null, 2));
});
