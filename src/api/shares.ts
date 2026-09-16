import { request } from './client';
import type { ApiResponse, ErrorResponse } from '../types/auth';
import type { GetSharedUsersResponse, ShareNoteRequest } from '../types/shares';

export function shareNote(body: ShareNoteRequest, token: string): Promise<ApiResponse | ErrorResponse> {
  return request<ApiResponse | ErrorResponse>('POST', '/api/shares', body, token);
}

export function getSharedUsers(
  noteId: number,
  token: string,
): Promise<GetSharedUsersResponse | ErrorResponse> {
  return request<GetSharedUsersResponse | ErrorResponse>(
    'GET',
    `/api/shares/note/${noteId}/users`,
    undefined,
    token,
  );
}
