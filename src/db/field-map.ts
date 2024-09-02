export enum ColumnDB {
  ts = 'time',
  // tradeId = 'trade_id',
  btds = 'bc',
  stds = 'sc',
  // partId = 'part_id',
}

export function toDbField(apiField: string) {
  let field: string = ColumnDB[apiField];
  if (field) {
    return field;
  }
  field = apiField;
  if (!/^[a-zA-Z-_]+$/.test(field)) {
    return undefined;
  }
  return field.replace(/[A-Z]/, (c) => `_${c.toLowerCase()}`);
}
