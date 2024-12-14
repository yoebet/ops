import { User } from '@/db/models/user';

export class LoginInfo {
  user: User;
  accessToken: string;
}
