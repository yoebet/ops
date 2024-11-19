import { WriteStream } from 'fs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
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

export function tsToISO8601(ts: number) {
  return new Date(Number(ts)).toISOString();
}

export function promisifyStream(writer: WriteStream) {
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

export function round(num: number, digits, _type?: 'price' | 'size'): string {
  if (digits !== null) {
    return num.toFixed(digits);
  }
  return '' + num;
}

export const SECOND_MS = 1000;
export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
