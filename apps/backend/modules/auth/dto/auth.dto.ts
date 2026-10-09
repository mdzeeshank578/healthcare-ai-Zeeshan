import { Role, UserStatus } from "@prisma/client";
export interface AuthUserResponseDto {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  isEmailVerified: boolean;
  fullName?: string;
  name?: string;
}
export interface AuthTokensResponseDto {
  accessToken: string;
  refreshToken: string;
}
export interface LoginResponseDto extends AuthTokensResponseDto {
  user: AuthUserResponseDto;
}
