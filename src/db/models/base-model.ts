import {
  BaseEntity,
  ColumnOptions,
  CreateDateColumn,
  DeleteDateColumn,
  getMetadataArgsStorage,
  Index,
  ValueTransformer,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { PrimaryGeneratedColumn } from 'typeorm/decorator/columns/PrimaryGeneratedColumn';
import { ColumnMetadataArgs } from 'typeorm/metadata-args/ColumnMetadataArgs';

export class BaseModel extends BaseEntity {
  @PrimaryGeneratedColumn({
    type: 'int',
  })
  id: number;

  // @Exclude()
  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @Exclude()
  @DeleteDateColumn()
  deletedAt?: Date;
}

export function NumericTransformer(): ValueTransformer {
  return {
    from(value: any) {
      if (value == null) {
        return value;
      }
      return +value;
    },
    to(value: any): any {
      return value;
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function NumericColumn(options?: ColumnOptions): Function {
  return function (object: any, propertyName: string) {
    getMetadataArgsStorage().columns.push({
      target: object.constructor,
      propertyName: propertyName,
      mode: 'regular',
      options: {
        type: 'numeric',
        transformer: NumericTransformer(),
        ...options,
      },
    } as ColumnMetadataArgs);
  };
}
