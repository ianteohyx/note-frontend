import { request } from './client';
import type { ApiResponse, ErrorResponse } from '../types/auth';
import type { AddNoteRequest, GetAllNoteResponse, GetSingleNoteResponse } from '../types/notes';

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

export function createNote(
  body: AddNoteRequest,
  token: string,
): Promise<ApiResponse | ErrorResponse> {
  return request<ApiResponse | ErrorResponse>('POST', '/api/notes', body, token);
}
