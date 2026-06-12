export interface SignupRequest {
  username: string;
  password: string;
}

export interface ResponseOutcome {
  success: boolean;
  code: string;
  desc: string;
}

export interface ApiResponse {
  responseOutcome: ResponseOutcome;
}

export interface ErrorResponse extends ApiResponse {
  message: string;
  fieldErrors?: Record<string, string>;
}
