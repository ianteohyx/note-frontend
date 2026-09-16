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
