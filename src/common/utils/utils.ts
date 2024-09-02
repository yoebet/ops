const nanoid = require('nanoid');

// ABCDEFGHIJKLMNOPQRSTUVWXYZ
const idGenerator = nanoid.customAlphabet(
  '0123456789abcdefghijklmnopqrstuvwxyz',
);

export const newId = () => idGenerator(16);

const accessTokenGenerator = idGenerator;
export const newAccessToken = () => accessTokenGenerator(12);

const numberNanoid = nanoid.customAlphabet('0123456789');
export const randomNumbers = (size: number) => numberNanoid(size);

export async function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const waitForExchangeInSSS = 200; //轮询查询交易所时间间隔

// n小时整点时间
export function nextSharpHour(hours: number, ts: number): number {
  if (hours > 23 || ts < 1e12) {
    throw new Error(`Wrong Parameter(${hours},${ts})`);
  }
  const periodMills = hours * 60 * 60 * 1000;
  const millsLeft = periodMills - (ts % periodMills);
  return ts + millsLeft;
}

export function tsToISO8601(ts: number) {
  try {
    return new Date(Number(ts)).toISOString();
  } catch (e) {
    console.log('tsToISO8601(ts: number):' + ts);
  }
}

export function getTsNow() {
  return new Date().getTime(); //当前毫秒
}
