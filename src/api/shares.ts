import { request } from './client';
import type { ApiResponse, ErrorResponse } from '../types/auth';
import type {
  GetSharedUsersResponse,
  ShareNoteRequest,
  UnshareNoteRequest,
  UpdateSharePermissionRequest,
} from '../types/shares';

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

export function updateSharePermissions(
  body: UpdateSharePermissionRequest,
  token: string,
): Promise<ApiResponse | ErrorResponse> {
  return request<ApiResponse | ErrorResponse>('PATCH', '/api/shares/permissions', body, token);
}

export function unshareNote(
  body: UnshareNoteRequest,
  token: string,
): Promise<ApiResponse | ErrorResponse> {
  return request<ApiResponse | ErrorResponse>('DELETE', '/api/shares/unshare', body, token);
}
