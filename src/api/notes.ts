import { request } from './client';
import type { ErrorResponse } from '../types/auth';
import type { GetAllNoteResponse, GetSingleNoteResponse } from '../types/notes';

export function getAllNotes(
  token: string,
  page = 0,
  size = 20,
): Promise<GetAllNoteResponse | ErrorResponse> {
  return request<GetAllNoteResponse | ErrorResponse>(
    'GET',
    `/api/notes?page=${page}&size=${size}`,
    undefined,
    token,
  );
}

export function getNoteById(id: number, token: string): Promise<GetSingleNoteResponse | ErrorResponse> {
  return request<GetSingleNoteResponse | ErrorResponse>('GET', `/api/notes/${id}`, undefined, token);
}
