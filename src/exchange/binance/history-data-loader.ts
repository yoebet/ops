import axios, { AxiosRequestConfig } from 'axios';
import * as fs from 'fs';
import * as AdmZip from 'adm-zip';
import { MINUTE_MS, promisifyStream } from '@/common/utils/utils';
import { BinanceBaseRest } from '@/exchange/binance/rest';
import {
  ExKline,
  HistoryKlinesByDayParams,
  HistoryKlinesByMonthParams,
} from '@/exchange/exchange-service.types';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { BinanceMarketSpot } from '@/exchange/binance/binance-market-spot';
import { Candle } from '@/exchange/binance/types';

// https://github.com/binance/binance-public-data/
// https://data.binance.vision/?prefix=data/spot/monthly/klines/DOGEUSDT/1d/

const EX = 'binance';
const BASE_URL = 'https://data.binance.vision';

export interface DownloadOptions {
  tradingType: 'spot' | 'um' | 'cm';
  timePeriod: 'monthly' | 'daily';
  dateStr: string; // yyyy-mm or yyyy-mm-dd
  symbol: string;
  interval: string;
  dataBaseDir?: string;
  saveZip?: boolean;
  saveFile?: boolean;
}

export class BinanceHistoryDataLoader {
  constructor(private proxies?: string[]) {}

  private buildRequestConfig() {
    const config: AxiosRequestConfig = {
      timeout: 5 * MINUTE_MS,
    };

    if (this.proxies && this.proxies.length > 0) {
      const pl = this.proxies.length;
      const selectProxy = pl === 1 ? 0 : Math.floor(Math.random() * pl);
      const agent = new SocksProxyAgent(this.proxies[selectProxy]);
      config.proxy = false;
      config.httpAgent = agent;
      config.httpsAgent = agent;
    }

    return config;
  }

  async downloadKlineFile(options: DownloadOptions): Promise<string[]> {
    const {
      tradingType,
      timePeriod,
      dateStr,
      symbol,
      interval,
      dataBaseDir,
      saveZip,
      saveFile,
    } = options;
    const fileName = `${symbol}-${interval}-${dateStr}.zip`;

    const tradingTypePath =
      tradingType === 'spot' ? tradingType : `futures/${tradingType}`;

    const url = `${BASE_URL}/data/${tradingTypePath}/${timePeriod}/klines/${symbol}/${interval}/${fileName}`;

    const baseDir = dataBaseDir ? dataBaseDir.replace(/\/$/, '') : 'data';
    let saveDir = `${baseDir}/${EX}/${tradingType}/${symbol}/${interval}`;
    if (timePeriod === 'daily') {
      // yyyy-mm
      saveDir = `${saveDir}/${dateStr.substring(0, 7)}`;
    }
    if (saveZip && !fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }
    const savePath = `${saveDir}/${fileName}`;

    let zip: AdmZip;

    if (fs.existsSync(savePath)) {
      zip = new AdmZip(savePath);
    } else {
      try {
        const response = await axios({
          ...this.buildRequestConfig(),
          method: 'get',
          url,
          responseType: saveZip ? 'stream' : 'arraybuffer',
        });
        if (saveZip) {
          const writer = fs.createWriteStream(savePath);
          response.data.pipe(writer);
          await promisifyStream(writer);
        }
        zip = new AdmZip(saveZip ? savePath : response.data);
      } catch (e) {
        console.error(url);
        throw e;
      }
    }

    const unzipFileName = fileName.replace('.zip', '.csv');
    let buffer: Buffer;
    if (saveFile) {
      zip.extractAllTo(saveDir);
      buffer = fs.readFileSync(`${saveDir}/${unzipFileName}`);
    } else {
      buffer = zip.getEntry(unzipFileName).getData();
    }

    const content = String(buffer);
    let rows = content.split('\n');
    if (tradingType !== 'spot') {
      // head line
      rows = rows.slice(1, rows.length);
    }
    return rows.filter((s) => s.length > 10);
  }

  static parseKlineCsvRows(rows: string[]) {
    const data = rows
      .map((row) => row.split(',') as any as Candle)
      .filter((c) => c[8]);
    return data.map(BinanceMarketSpot.toKline);
  }

  // private getTradingType(market: ExMarket) {
  //   if (market === ExMarket.perp_inv) {
  //     return 'cm';
  //   }
  //   if (market === ExMarket.perp) {
  //     return 'um';
  //   }
  //   return 'spot';
  // }

  async loadHistoryKlinesByMonth(
    params: HistoryKlinesByMonthParams,
  ): Promise<ExKline[]> {
    const { yearMonth, symbol, interval } = params;
    const downloadOptions: DownloadOptions = {
      tradingType: 'spot',
      timePeriod: 'monthly',
      dateStr: yearMonth,
      symbol,
      interval: BinanceBaseRest.toCandleInv(interval),
      saveZip: true,
    };

    const rows = await this.downloadKlineFile(downloadOptions);

    return BinanceHistoryDataLoader.parseKlineCsvRows(rows);
  }

  async loadHistoryKlinesByDay(
    params: HistoryKlinesByDayParams,
  ): Promise<ExKline[]> {
    const { date, symbol, interval } = params;
    const downloadOptions: DownloadOptions = {
      tradingType: 'spot',
      timePeriod: 'daily',
      dateStr: date,
      symbol,
      interval: BinanceBaseRest.toCandleInv(interval),
      saveZip: true,
    };

    const rows = await this.downloadKlineFile(downloadOptions);

    return BinanceHistoryDataLoader.parseKlineCsvRows(rows);
  }
}
