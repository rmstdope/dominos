/** Every error the API returns has this body, so the frontend can branch on `code`. */
export type ApiError = {
  error: {
    code: ApiErrorCode;
    message: string;
  };
};

export type ApiErrorCode =
  | "validation_failed"
  | "invalid_credentials"
  | "invalid_token"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "internal";
