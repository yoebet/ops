export enum ExchangeCode {
  binance = 'binance',
  okx = 'okx',
}

export enum ExAccountCode {
  okxUnified = 'okx-unified',
  binanceSpot = 'binance-spot',
  binanceUm = 'binance-usd-m',
  binanceCm = 'binance-coin-m',
}

export enum ExMarket {
  spot = 'spot', //现货
  perp = 'perp', //正向永续
  perp_inv = 'perp_inv', //反向永续
}
