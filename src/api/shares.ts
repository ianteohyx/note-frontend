import { request } from './client';
import type { ApiResponse, ErrorResponse } from '../types/auth';
import type { ShareNoteRequest } from '../types/shares';

export function shareNote(body: ShareNoteRequest, token: string): Promise<ApiResponse | ErrorResponse> {
  return request<ApiResponse | ErrorResponse>('POST', '/api/shares', body, token);
}
