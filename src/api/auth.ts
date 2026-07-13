import { request } from './client';
import type { ApiResponse, ErrorResponse, SignupRequest } from '../types/auth';

export function signup(payload: SignupRequest): Promise<ApiResponse | ErrorResponse> {
  return request<ApiResponse | ErrorResponse>('POST', '/api/users/signup', payload);
}
