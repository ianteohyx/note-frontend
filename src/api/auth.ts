import { request } from './client';
import type { ApiResponse, ErrorResponse, LoginRequest, LoginResponse, SignupRequest } from '../types/auth';

export function signup(payload: SignupRequest): Promise<ApiResponse | ErrorResponse> {
  return request<ApiResponse | ErrorResponse>('POST', '/api/users/signup', payload);
}

export function login(payload: LoginRequest): Promise<LoginResponse | ErrorResponse> {
  return request<LoginResponse | ErrorResponse>('POST', '/api/users/login', payload);
}
