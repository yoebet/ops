export interface ExApiKey {
  key: string;
  secret: string;
  password?: string;
  secret2fa?: string;
  subaccount?: string;
  withdrawPassword?: string;
}

export interface ExtendedApiKey extends ExApiKey {
  exchangeUserId: string;
  mainAccountApiKey?: ExtendedApiKey;
}
