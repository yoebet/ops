import { BaseModel } from '@/db/models/base-model';
import { Column, Entity, Index } from 'typeorm';
import { ServerProfile } from '@/common/server-profile.type';

@Entity()
export class InstanceLog extends BaseModel {
  @Column()
  nodeId: string;

  @Column({ nullable: true })
  profileName?: string;
  @Column({ type: 'jsonb', nullable: true })
  profile?: ServerProfile;

  @Column({ nullable: true })
  gitBranch?: string;
  @Column({ nullable: true })
  gitSha?: string;
  @Column({ nullable: true })
  gitCommitAt?: string;

  @Column()
  startedAt: Date;
  @Column({ nullable: true })
  stoppedAt?: Date;
  @Column({ nullable: true })
  stopStyle?: string;
}
