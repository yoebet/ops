import { Injectable } from '@nestjs/common';
import { Exchanges } from '@/exchange/exchanges';
import { AppLogger } from '@/common/app-logger';
import { ExTradeType } from '@/db/models/exchange-types';
import { UserExAccount } from '@/db/models/user-ex-account';
import { ExAssetSnapshot } from '@/db/models/ex-asset-snapshot';
import { ExAssetSnapshotCoin } from '@/db/models/ex-asset-snapshot-coin';

@Injectable()
export class ExAssetService {
  constructor(
    private readonly exchanges: Exchanges,
    private logger: AppLogger,
  ) {
    logger.setContext('ExAssetService');
  }

  async syncAssets() {
    const ue = await UserExAccount.findOneBy({ id: 1 });
    const tradeType = ExTradeType.spot;
    await this.syncAssetForUserAccount(ue, tradeType);
  }

  async syncAssetForUserAccount(
    ue: UserExAccount,
    tradeType: ExTradeType,
    eqUsdThreshold = 0.1,
  ): Promise<ExAssetSnapshot> {
    const tradeService = this.exchanges.getExTradeService(ue.ex, tradeType);
    const accountType = this.exchanges.getExAccountType(ue.ex, tradeType);
    const os = await tradeService.getAccountBalance(
      UserExAccount.buildExApiKey(ue),
    );
    const asset = new ExAssetSnapshot();
    asset.userExAccountId = ue.id;
    asset.ex = ue.ex;
    asset.accountType = accountType;
    asset.totalEqUsd = os.totalEqUsd;
    asset.time = new Date(os.timestamp);
    await ExAssetSnapshot.save(asset);
    const cas: ExAssetSnapshotCoin[] = [];
    for (const item of os.coinAssets) {
      if (item.eqUsd != null && item.eqUsd < eqUsdThreshold) {
        continue;
      }
      const ca = new ExAssetSnapshotCoin();
      ca.time = asset.time;
      ca.snapshotId = asset.id;
      ca.userExAccountId = asset.userExAccountId;
      ca.accountType = asset.accountType;
      ca.ex = asset.ex;
      ca.coin = item.coin;
      ca.availBal = item.availBal;
      ca.frozenBal = item.frozenBal;
      ca.ordFrozen = item.ordFrozen;
      ca.eq = item.eq;
      ca.eqUsd = item.eqUsd;
      cas.push(ca);
    }
    await ExAssetSnapshotCoin.save(cas);
    asset.coinAssets = cas;
    return asset;
  }
}
