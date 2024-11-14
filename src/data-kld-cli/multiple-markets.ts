import { ExSymbolCodes, ExSymbolScope } from '@/data-kld-cli/commands';
import { ES } from '@/data-service/models/base';

let symbolKeyCounter = 1;
const symbolKeysMap = new Map<string, string>();
// symbolKey ->
const exSymbolsMap = new Map<string, ES[]>();

export function buildDataScopeExSymbol(
  exSymbols: ExSymbolCodes[],
): ExSymbolScope {
  const onlyOne = exSymbols.length === 1 && exSymbols[0].symbols.length === 1;
  if (onlyOne) {
    return {
      ex: exSymbols[0].ex,
      symbol: exSymbols[0].symbols[0],
    };
  }
  exSymbols = exSymbols
    .map(({ ex, symbols }) => ({
      ex,
      symbols: symbols.sort(),
    }))
    .sort((e1, e2) => e1.ex.localeCompare(e2.ex));
  const kk = exSymbols
    .map(({ ex, symbols }) => `${ex}:${symbols.join('|')}`)
    .join(',')
    .replace(/-PERP/g, '-P')
    .replace(/\/USD/g, '/U');

  let symbolKey = symbolKeysMap.get(kk);
  if (!symbolKey) {
    symbolKey = `s${symbolKeyCounter++}`;
    symbolKeysMap.set(kk, symbolKey);

    const es: ES[] = [];
    exSymbols.forEach(({ ex, symbols }) => {
      symbols.forEach((symbol) => {
        es.push({ ex, symbol });
      });
    });
    exSymbolsMap.set(symbolKey, es);
  }
  return {
    ex: 'e',
    symbol: symbolKey,
    exSymbols,
  };
}
