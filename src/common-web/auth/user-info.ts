export interface UserInfo {
  username: string;
  userId: number;
  role?: string;
  // bs?: string;
  // locale?: string;
}

export type JwtPayload = UserInfo;
