export type ProductImageErrorCode =
  | "IMAGE_NOT_FOUND"
  | "IMAGE_TOO_LARGE"
  | "IMAGE_STORAGE_NOT_CONFIGURED"
  | "IMAGE_SOURCE_INVALID"
  | "IMAGE_STORAGE_DNS_ERROR"
  | "IMAGE_STORAGE_TIMEOUT"
  | "IMAGE_STORAGE_ACCESS_DENIED"
  | "IMAGE_STORAGE_PAYMENT_REQUIRED"
  | "IMAGE_STORAGE_RATE_LIMITED"
  | "IMAGE_STORAGE_UNAVAILABLE"
  | "IMAGE_RESPONSE_INVALID"
  | "IMAGE_LOAD_FAILED";

export interface ProductImageErrorResponse {
  code: ProductImageErrorCode;
  message: string;
  action: string;
  retryable: boolean;
  requestId: string;
}
