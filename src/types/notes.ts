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

export interface AddNoteRequest {
  noteTitle: string;
  noteContent: string;
}

export interface UpdateNoteRequest {
  noteTitle: string;
  noteContent: string;
}

export type NoteFilter = 'MY' | 'SHARED' | 'ALL';

/** A note or shared-note as it appears in the list — `id` is the note id for
 * an owned note, or the *shared-note record's* id for a shared one (the id
 * `GET/PATCH /api/shares/{id}` expects, distinct from the underlying note id). */
export interface NoteListItem {
  id: number;
  kind: 'own' | 'shared';
  note: NoteDto;
}

export type SelectedNoteRef = Pick<NoteListItem, 'id' | 'kind'>;
