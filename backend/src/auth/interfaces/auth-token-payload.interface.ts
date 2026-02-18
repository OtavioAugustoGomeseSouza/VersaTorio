export enum UserRole {
  admin = 'admin',
  user = 'user',
}

export interface AuthTokenPayload {
  id: string;
  email: string;
  role: UserRole;
}

export interface RefreshTokenPayload extends AuthTokenPayload {
  jti: string;
}
