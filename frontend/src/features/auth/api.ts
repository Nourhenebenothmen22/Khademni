import { apiRequest, fetchCsrfToken, setAccessToken } from "@/lib/api/client";
import { ApiResponse, User } from "@/types/backend";

export interface LoginPayload {
  email: string;
  password?: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password?: string;
}

export interface MfaLoginPayload {
  mfaToken: string;
  code: string;
}

export interface MfaVerifyPayload {
  code: string;
}

export interface ResetPasswordRequestPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password?: string;
  newPassword?: string;
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<ApiResponse<{ message: string }>> {
  const newPassword = payload.newPassword || payload.password;
  return apiRequest<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token: payload.token, newPassword }),
  });
}

export interface AuthSuccessData {
  user: User;
  accessToken: string;
  refreshToken?: string;
  mfaRequired?: boolean;
  mfaToken?: string;
}

export async function getCsrfToken(): Promise<string> {
  return fetchCsrfToken();
}

export async function registerUser(payload: RegisterPayload): Promise<ApiResponse<User>> {
  return apiRequest<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload: LoginPayload): Promise<ApiResponse<AuthSuccessData>> {
  const res = await apiRequest<AuthSuccessData>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (res.data?.accessToken) {
    setAccessToken(res.data.accessToken);
  }
  return res;
}

export async function loginMfa(payload: MfaLoginPayload): Promise<ApiResponse<AuthSuccessData>> {
  const res = await apiRequest<AuthSuccessData>("/auth/mfa/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (res.data?.accessToken) {
    setAccessToken(res.data.accessToken);
  }
  return res;
}

export async function setupMfa(): Promise<ApiResponse<{ secret: string; qrCodeUrl: string }>> {
  return apiRequest<{ secret: string; qrCodeUrl: string }>("/auth/mfa/setup", {
    method: "POST",
  });
}

export async function verifyMfa(payload: MfaVerifyPayload): Promise<ApiResponse<{ enabled: boolean }>> {
  return apiRequest<{ enabled: boolean }>("/auth/mfa/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function requestPasswordReset(payload: ResetPasswordRequestPayload): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function logoutUser(): Promise<ApiResponse<{ message: string }>> {
  const res = await apiRequest<{ message: string }>("/auth/logout", {
    method: "POST",
  });
  setAccessToken(null);
  return res;
}
