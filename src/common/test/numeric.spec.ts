import {
  roundDown,
  roundNumber,
  toFixedDown,
  toFixedNumber,
} from '@/common/utils/numeric';

test('有效数字', () => {
  expect(roundNumber(null as any as string, 5)).toBe('');
  expect(roundNumber(NaN as any as number, 5)).toBe('');
  expect(roundNumber(undefined as any as number, 5)).toBe('');

  // 截断（向下取整）
  expect(roundNumber('123.456789', 5, true)).toBe('123.45');
  expect(roundNumber('123.456789', 4, true)).toBe('123.4');
  expect(roundNumber('123.456789', 3, true)).toBe('123');
  // 整数部分不影响
  expect(roundNumber('123.456789', 2, true)).toBe('123');
  // 末位四舍五入
  expect(roundNumber('123.456789', 5, false)).toBe('123.46');

  expect(roundNumber('0.0001234567', 3, true)).toBe('0.000123');
  expect(roundNumber('0.0001234567', 5, true)).toBe('0.00012345');
  expect(roundNumber('0.0001234567', 5, false)).toBe('0.00012346');
  // floor 默认为 false
  expect(roundNumber('0.0001234567', 5)).toBe('0.00012346');

  // roundDown 省去 floor: true 参数
  expect(roundDown('123.456789', 5)).toBe('123.45');
  expect(roundDown(123.456789, 5)).toBe('123.45');

  // 科学计数法也支持
  expect(roundDown('1.23456e-6', 3)).toBe('1.23e-6');
  expect(roundDown('1.23456E-6', 3)).toBe('1.23E-6');
  expect(roundDown(1.23456e-6, 3)).toBe('0.00000123');
  expect(roundDown(1.23456e-7, 3)).toBe('1.23e-7');
  expect(roundDown(1.23456e-8, 3)).toBe('1.23e-8');
  expect(+roundDown(1.23456e-6, 3)).toEqual(1.23e-6);
  expect(+roundDown(1.23456e-7, 3)).toEqual(1.23e-7);
});

test('小数位数', () => {
  expect(toFixedNumber(null as any as string, 3)).toBe('');
  expect(toFixedNumber(NaN as any as number, 3)).toBe('');
  expect(toFixedNumber(undefined as any as number, 3)).toBe('');

  expect(toFixedNumber('123.456789', 3, true)).toBe('123.456');
  expect(toFixedNumber('123.456789', 3, false)).toBe('123.457');
  // floor 默认为 false
  expect(toFixedNumber('123.456789', 3)).toBe('123.457');

  // toFixedDown 省去 floor: true 参数
  expect(toFixedDown('123.456789', 3)).toBe('123.456');
  expect(toFixedDown(123.456789, 3)).toBe('123.456');

  expect(toFixedDown(0.123456, 3)).toBe('0.123');
  expect(toFixedDown(0.0123456, 3)).toBe('0.012');
  expect(toFixedDown(0.00123456, 3)).toBe('0.001');
  expect(toFixedDown(0.00123456, 4)).toBe('0.0012');
  expect(toFixedDown(0.00123456, 5)).toBe('0.00123');

  // toFixedDown 省去 floor: true 参数
  expect(toFixedDown(123.456789, 3)).toBe('123.456');
  expect(toFixedDown(123.456789, 2)).toBe('123.45');
  expect(toFixedDown(123.456789, 1)).toBe('123.4');
  expect(toFixedDown(123.456789, 0)).toBe('123');
});
