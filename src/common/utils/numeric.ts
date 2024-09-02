function strNum(val: string | number): {
  str: string;
  num: number | undefined;
} {
  if (typeof val === 'undefined') {
    return { str: '', num: undefined };
  }
  if (val == null) {
    return { str: '', num: undefined };
  }
  let str: string;
  let num: number;
  if (typeof val === 'number') {
    if (isNaN(val)) {
      return { str: '', num: undefined };
    }
    str = '' + val;
    num = val;
  } else {
    if (val === '') {
      return { str: '', num: undefined };
    }
    str = val;
    num = +val;
  }
  return { str, num };
}

/**
 * 数值位数处理
 * @param val 数值
 * @param digits 有效数字
 * @param floor false: 四舍五入；true: 向下取整
 */
export function roundNumber(
  val: string | number,
  digits: number,
  floor = false,
): string {
  const { str, num } = strNum(val);
  if (num === undefined) {
    return str;
  }
  if (/\d[eE]-\d+$/.test(str)) {
    const index = /[eE]-\d+$/.exec(str)!.index;
    const ns = str.substring(0, index);
    const ep = str.substring(index);
    const nss = roundNumber(ns, digits, floor);
    return nss + ep;
  }
  const di = str.indexOf('.');
  if (di === -1) {
    return str;
  }
  if (floor && di >= digits) {
    return str.substring(0, di);
  }
  if (str.length - 1 <= digits) {
    return str;
  }

  let fractionDigits = digits - di;
  if (fractionDigits < 0) {
    fractionDigits = 0;
  }
  if (str.startsWith('0.')) {
    fractionDigits++;
  }

  if (!str.startsWith('0.')) {
    if (floor) {
      return str.substring(0, digits + 1);
    }
    return num.toFixed(fractionDigits);
  }

  // 0.0*x
  let fraction = fractionDigits;
  for (let i = 2; i < str.length; i++) {
    if (str.charAt(i) === '0') {
      fraction++;
    } else {
      break;
    }
  }
  if (str.length <= fraction + 2) {
    return str;
  }
  if (floor) {
    return str.substring(0, fraction + 2);
  }
  return num.toFixed(fraction);
}

/**
 * 数值位数处理
 * @param val 数值
 * @param fractionDigits 小数位数
 * @param floor false: 四舍五入；true: 向下取整
 */
export function toFixedNumber(
  val: string | number,
  fractionDigits: number,
  floor = false,
): string {
  const { str, num } = strNum(val);
  if (num === undefined) {
    return str;
  }
  const di = str.indexOf('.');
  if (di === -1) {
    return str;
  }
  if (str.length - 1 <= di + fractionDigits) {
    return str;
  }
  if (floor) {
    if (fractionDigits === 0) {
      return str.substring(0, di);
    }
    return str.substring(0, di + 1 + fractionDigits);
  }
  return num.toFixed(fractionDigits);
}

export function toFixedDown(val: string | number, digits: number): string {
  return toFixedNumber(val, digits, true);
}

export function roundDown(val: string | number, digits: number): string {
  return roundNumber(val, digits, true);
}
