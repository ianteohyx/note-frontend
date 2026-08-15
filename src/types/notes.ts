import type { ApiResponse } from './auth';

export interface NoteDto {
  id: number;
  title: string;
  content: string;
  authorName: string;
  dateCreated: string;
  dateModified: string;
}

export interface GetAllNoteResponse extends ApiResponse {
  notes: NoteDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface GetSingleNoteResponse extends ApiResponse {
  noteDto: NoteDto;
}
