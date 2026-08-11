export type ResponseOutcome =
  | 'SUCCESS'
  | 'PROCESS_FAIL'
  | 'PARAM_ILLEGAL'
  | 'VALIDATION_ERROR'
  | 'USERNAME_EXIST'
  | 'USER_NOT_EXIST'
  | 'PASSWORD_INVALID'
  | 'LOGIN_FAIL'
  | 'TOKEN_INVALID'
  | 'REFRESH_TOKEN_INVALID'
  | 'NOTE_NOT_EXIST'
  | 'NOTE_NOT_SHARED'
  | 'ACTION_NOT_ALLOWED'
  | 'NOTE_ALREADY_SHARED'
  | 'RATE_LIMIT_EXCEEDED';

export interface SignupRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface ApiResponse {
  responseOutcome: ResponseOutcome;
}

export interface LoginResponse extends ApiResponse {
  token: string;
  refreshToken: string;
}

export interface ErrorResponse extends ApiResponse {
  message: string;
  fieldErrors?: Record<string, string>;
}
