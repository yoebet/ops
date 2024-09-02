import { join } from 'path';
import * as fs from 'fs';
import * as csvParser from 'csv-parser';
import { Test } from '@nestjs/testing';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { CoinConfig } from '@/db/models/coin-config';
import { wait } from '@/common/utils/utils';

jest.setTimeout(60_000);

describe('CoinConfigService', () => {
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule],
    }).compile();

    await moduleRef.init();
  });

  describe('create', () => {
    it('create coin-configs BTC', async () => {
      const btc = new CoinConfig();
      btc.coin = 'BTC';
      btc.volumeSmallMax = '0.5/1/2';
      btc.volumeBigMin = '50/100/200';
      btc.usdVolumeSmallMax = '5K/10K/20K';
      btc.usdVolumeBigMin = '50M/100M/500M';
      await CoinConfig.save(btc);
    });
  });

  it('create/update coin-configs', async () => {
    function collectConfigs(results: any[]) {
      const ccs: CoinConfig[] = [];
      let displayOrder = 10;
      for (const row of results) {
        if (!row['币种']) {
          continue;
        }
        const cc = new CoinConfig();
        cc.coin = row['币种'];
        cc.volumeSmallMax = row['小单最大'];
        cc.volumeBigMin = row['大单最小'];
        cc.usdVolumeSmallMax = row['小单最大（USD）'];
        cc.usdVolumeBigMin = row['大单最小（USD）'];
        cc.displayOrder = displayOrder;

        let valid = true;
        for (const f of [
          'volumeSmallMax',
          'volumeBigMin',
          'usdVolumeSmallMax',
          'usdVolumeBigMin',
        ]) {
          if (!cc[f]) {
            console.warn(`${cc.coin}: missing ${f}`);
            valid = false;
            break;
          }
          cc[f] = cc[f]
            .split(',')
            .map((s) => s.trim())
            .join('/');
        }
        if (!valid) {
          continue;
        }
        ccs.push(cc);
        displayOrder += 10;
      }

      return ccs;
    }

    const parser = csvParser();
    const results = [];
    // No BOM
    fs.createReadStream(join(__dirname, 'coin-config.csv'))
      .pipe(parser)
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', async () => {
        const ccs = collectConfigs(results);
        if (ccs.length === 0) {
          console.warn(`no coins`);
          return;
        }
        // console.log(ccs);
        await CoinConfig.upsert(ccs, ['coin']);
      });

    await wait(50_000);
  });
});
