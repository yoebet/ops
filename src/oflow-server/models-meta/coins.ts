export interface OflCoinConfig {
  coin: string;

  name?: string;

  // 大小单界限候选项
  // 斜杠分隔，可以用K/M单位
  // 如 0.5/1/2
  volumeSmallMax?: string;

  volumeBigMin?: string;

  // 如 5K/10K/20K
  usdVolumeSmallMax?: string;

  usdVolumeBigMin?: string;
}
