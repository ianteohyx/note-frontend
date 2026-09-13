export type Permission = 'READ' | 'WRITE';

export interface ShareNoteRequest {
  noteId: number;
  sharedToUsername: string;
  permission: Permission;
}
