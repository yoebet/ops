export interface UserInfo {
  username: string;
  userId: number;
  role?: string;
  // locale?: string;
}

export type JwtPayload = UserInfo;
