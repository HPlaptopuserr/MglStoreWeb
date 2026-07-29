import { API, authFetch } from "@/lib/api";
import type {
  ContractArchiveResponse,
  ScannedContractForm,
} from "./types";

export async function getContractArchive(): Promise<ContractArchiveResponse> {
  const response = await authFetch(`${API}/contracts/vendor/archive`, {
    cache: "no-store",
  });
  const payload = (await response.json()) as ContractArchiveResponse;
  if (!response.ok) {
    throw new Error(payload.error || "Гэрээний архив авахад алдаа гарлаа");
  }
  return payload;
}

export async function registerScannedContract(
  values: ScannedContractForm,
  file: File,
): Promise<void> {
  const body = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    if (key === "customFields") {
      body.append(key, JSON.stringify(value));
    } else if (typeof value === "string" && value.trim()) {
      body.append(key, value.trim());
    }
  });
  body.append("file", file);

  const response = await authFetch(`${API}/contracts/scanned/register`, {
    method: "POST",
    body,
  });
  const payload = (await response.json()) as {
    success?: boolean;
    error?: string;
  };
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "Гэрээ бүртгэхэд алдаа гарлаа");
  }
}
