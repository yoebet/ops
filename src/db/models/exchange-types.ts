export enum ExchangeCode {
  binance = 'binance',
  okx = 'okx',
}

export enum ExAccountType {
  unified = 'unified',
  spot = 'spot',
  margin = 'margin', // spot margin - cross
  perp = 'perp',
}

export enum ExTradeType {
  spot = 'spot',
  margin = 'margin', // spot margin - cross
  // margin_isolated = 'margin_isolated', // spot margin - isolated
  perp = 'perp',
  // perp_isolated = 'perp_isolated' // perp - isolated
  // perp_inv = 'perp_inv'
  // perp_inv_isolated = 'perp_inv_isolated' // perp_inv - isolated
}

export enum ExMarket {
  spot = 'spot', //现货
  perp = 'perp', //正向永续
  perp_inv = 'perp_inv', //反向永续
}
