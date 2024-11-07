import { User } from '@/db/models/sys/user';

export interface LoginInfo {
  user: User;
  accessToken: string;
}
