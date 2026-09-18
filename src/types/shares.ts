import type { ApiResponse } from './auth';
import type { NoteDto } from './notes';

export type Permission = 'READ' | 'WRITE';

export interface ShareNoteRequest {
  noteId: number;
  sharedToUsername: string;
  permission: Permission;
}

export interface SharedUserDto {
  username: string;
  permission: Permission;
}

export interface GetSharedUsersResponse extends ApiResponse {
  sharedUsers: SharedUserDto[];
}

export interface UpdateSharePermissionItem {
  noteId: number;
  sharedToUsername: string;
  permission: Permission;
}

export interface UpdateSharePermissionRequest {
  updates: UpdateSharePermissionItem[];
}

export interface UnshareNoteItem {
  noteId: number;
  sharedToUsername: string;
}

export interface UnshareNoteRequest {
  unshares: UnshareNoteItem[];
}

export interface SharedNoteDto {
  id: number;
  note: NoteDto;
  permission: Permission;
}

export interface GetAllSharedToMeResponse extends ApiResponse {
  sharedNotes: SharedNoteDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface GetSingleSharedNoteResponse extends ApiResponse {
  sharedNote: SharedNoteDto;
}

export interface EditSharedNoteRequest {
  updatedShareNoteTitle: string;
  updatedShareNoteContent: string;
}
