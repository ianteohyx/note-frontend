import { request } from './client';
import type { ApiResponse, ErrorResponse, LoginRequest, LoginResponse, SignupRequest } from '../types/auth';

export function signup(payload: SignupRequest): Promise<ApiResponse | ErrorResponse> {
  return request<ApiResponse | ErrorResponse>('POST', '/api/users/signup', payload);
}

export function login(payload: LoginRequest): Promise<LoginResponse | ErrorResponse> {
  return request<LoginResponse | ErrorResponse>('POST', '/api/users/login', payload);
}

/**
 * Exchanges the HttpOnly `refreshToken` cookie for a fresh access token.
 * Sends no body — the browser attaches the cookie because `request()` uses
 * `credentials: 'include'`. Used on app start to survive a page reload.
 */
export function refresh(): Promise<LoginResponse | ErrorResponse> {
  return request<LoginResponse | ErrorResponse>('POST', '/api/users/refresh');
}

/** Revokes the refresh token server-side and clears its cookie. Idempotent. */
export function logout(): Promise<ApiResponse | ErrorResponse> {
  return request<ApiResponse | ErrorResponse>('POST', '/api/users/logout');
}
