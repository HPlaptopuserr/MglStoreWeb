import type {
  ProductImageErrorCode,
  ProductImageErrorResponse,
} from "@mgl/types";

type ImageErrorDefinition = Pick<
  ProductImageErrorResponse,
  "message" | "action" | "retryable"
> & { status: number };

const IMAGE_ERRORS: Record<ProductImageErrorCode, ImageErrorDefinition> = {
  IMAGE_NOT_FOUND: {
    status: 404,
    message: "Бүтээгдэхүүний зураг олдсонгүй.",
    action: "Байгууллагын админ бүтээгдэхүүний зургийг дахин оруулна уу.",
    retryable: false,
  },
  IMAGE_TOO_LARGE: {
    status: 413,
    message: "Бүтээгдэхүүний зураг 8 MB хэмжээнээс хэтэрсэн байна.",
    action: "Зургийн хэмжээг багасгаж дахин оруулна уу.",
    retryable: false,
  },
  IMAGE_STORAGE_NOT_CONFIGURED: {
    status: 503,
    message: "Зураг хадгалах үйлчилгээний тохиргоо дутуу байна.",
    action: "Системийн админ API серверийн SUPABASE_URL тохиргоог шалгана уу.",
    retryable: false,
  },
  IMAGE_SOURCE_INVALID: {
    status: 422,
    message: "Бүтээгдэхүүний зургийн хаяг буруу байна.",
    action: "Системийн админ зургийн URL болон storage тохиргоог шалгана уу.",
    retryable: false,
  },
  IMAGE_STORAGE_DNS_ERROR: {
    status: 503,
    message: "Зураг хадгалах серверийн хаяг олдсонгүй (DNS).",
    action:
      "Системийн админ Supabase төслийн төлөв, URL болон Billing хэсгийн төлбөрийн төлөвийг шалгана уу.",
    retryable: true,
  },
  IMAGE_STORAGE_TIMEOUT: {
    status: 504,
    message: "Зураг хадгалах сервер хугацаандаа хариу өгсөнгүй.",
    action:
      "Түр хүлээгээд дахин оролдоно уу. Давтагдвал админ Supabase төслийн төлөвийг шалгана уу.",
    retryable: true,
  },
  IMAGE_STORAGE_ACCESS_DENIED: {
    status: 502,
    message: "Зургийг унших эрхийг хадгалалтын сервер зөвшөөрсөнгүй.",
    action: "Системийн админ зургийн bucket-ийн унших эрхийг шалгана уу.",
    retryable: false,
  },
  IMAGE_STORAGE_PAYMENT_REQUIRED: {
    status: 503,
    message: "Зураг хадгалах үйлчилгээ төлбөрийн шаардлагаар хаагдсан байна.",
    action:
      "Системийн админ Supabase Billing хэсгийн төлбөрийн төлөвийг шалгана уу.",
    retryable: false,
  },
  IMAGE_STORAGE_RATE_LIMITED: {
    status: 503,
    message: "Зураг хадгалах үйлчилгээний хүсэлтийн хязгаарт хүрсэн байна.",
    action: "Түр хүлээгээд зургийг дахин ачаална уу.",
    retryable: true,
  },
  IMAGE_STORAGE_UNAVAILABLE: {
    status: 502,
    message: "Зураг хадгалах үйлчилгээтэй холбогдож чадсангүй.",
    action:
      "Түр хүлээгээд дахин оролдоно уу. Давтагдвал системийн админд мэдэгдэнэ үү.",
    retryable: true,
  },
  IMAGE_RESPONSE_INVALID: {
    status: 502,
    message: "Хадгалалтын серверээс хүчинтэй зураг ирсэнгүй.",
    action: "Байгууллагын админ хадгалсан зургийн файлыг шалгана уу.",
    retryable: false,
  },
  IMAGE_LOAD_FAILED: {
    status: 500,
    message: "Бүтээгдэхүүний зургийг уншиж чадсангүй.",
    action:
      "Дахин оролдоно уу. Давтагдвал алдааны дугаарыг системийн админд өгнө үү.",
    retryable: true,
  },
};

export class ProductImageDeliveryError extends Error {
  readonly status: number;

  constructor(
    readonly code: ProductImageErrorCode,
    readonly diagnostics: {
      upstreamStatus?: number;
      networkCode?: string;
    } = {},
  ) {
    super(IMAGE_ERRORS[code].message);
    this.name = "ProductImageDeliveryError";
    this.status = IMAGE_ERRORS[code].status;
  }

  toResponse(requestId: string): ProductImageErrorResponse {
    const { message, action, retryable } = IMAGE_ERRORS[this.code];
    return { code: this.code, message, action, retryable, requestId };
  }
}

export function productImageUpstreamError(status: number) {
  let code: ProductImageErrorCode = "IMAGE_STORAGE_UNAVAILABLE";
  if (status === 404) code = "IMAGE_NOT_FOUND";
  else if (status === 402) code = "IMAGE_STORAGE_PAYMENT_REQUIRED";
  else if (status === 401 || status === 403)
    code = "IMAGE_STORAGE_ACCESS_DENIED";
  else if (status === 429) code = "IMAGE_STORAGE_RATE_LIMITED";
  else if ([408, 504, 524, 544].includes(status))
    code = "IMAGE_STORAGE_TIMEOUT";
  return new ProductImageDeliveryError(code, { upstreamStatus: status });
}

export function productImageNetworkError(error: unknown) {
  // Node fetch nests DNS/socket failures in Error.cause. Do not return raw
  // exceptions, provider response bodies, credentials or storage URLs to clients.
  let current = error;
  for (let depth = 0; depth < 5 && current instanceof Error; depth += 1) {
    const code = "code" in current ? String(current.code) : "";
    if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
      return new ProductImageDeliveryError("IMAGE_STORAGE_DNS_ERROR", {
        networkCode: code,
      });
    }
    if (
      current.name === "AbortError" ||
      current.name === "TimeoutError" ||
      [
        "ETIMEDOUT",
        "UND_ERR_CONNECT_TIMEOUT",
        "UND_ERR_HEADERS_TIMEOUT",
        "UND_ERR_BODY_TIMEOUT",
      ].includes(code)
    ) {
      return new ProductImageDeliveryError("IMAGE_STORAGE_TIMEOUT", {
        networkCode: code || current.name,
      });
    }
    current = "cause" in current ? current.cause : undefined;
  }
  return new ProductImageDeliveryError("IMAGE_STORAGE_UNAVAILABLE");
}
