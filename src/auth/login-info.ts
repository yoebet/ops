import { User } from '@/db/models/user';

export interface LoginInfo {
  user: User;
  accessToken: string;
}
