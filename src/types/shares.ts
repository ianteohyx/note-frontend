import type { ApiResponse } from './auth';

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
