import { ExTrade } from '@/exchange/exchanges-types';

export const sortExTrade = (a: ExTrade, b: ExTrade): number => {
  const ta = +a.tradeId;
  const tb = +b.tradeId;
  if (ta && tb) {
    return ta - tb;
  }
  return +a.ts - +b.ts;
};
