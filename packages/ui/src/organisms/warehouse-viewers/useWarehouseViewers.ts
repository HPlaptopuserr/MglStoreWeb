"use client";
import { useCallback, useEffect, useState } from "react";
import type { WarehouseViewerMember } from "@mgl/types";
export interface WarehouseViewerTransport {
  apiBase: string;
  request: (input: string, init?: RequestInit) => Promise<Response>;
}
async function getApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const value: unknown = await response.json().catch(() => null);
  return value &&
    typeof value === "object" &&
    "message" in value &&
    typeof value.message === "string"
    ? value.message
    : fallback;
}

export function useWarehouseViewers(
  warehouseId: string,
  { apiBase, request }: WarehouseViewerTransport,
) {
  const [members, setMembers] = useState<WarehouseViewerMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const endpoint = `${apiBase}/warehouses/${encodeURIComponent(warehouseId)}/viewers`;
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await request(endpoint);
      if (!response.ok)
        throw new Error(
          await getApiErrorMessage(
            response,
            "Харах эрхтэй хэрэглэгчдийг ачаалж чадсангүй.",
          ),
        );
      setMembers((await response.json()) as WarehouseViewerMember[]);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Сервертэй холбогдож чадсангүй.",
      );
    } finally {
      setLoading(false);
    }
  }, [endpoint, request]);
  useEffect(() => {
    void load();
  }, [load]);
  const mutate = async (phoneOrUserId: string, method: "POST" | "DELETE") => {
    if (busy) return false;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await request(
        method === "POST"
          ? endpoint
          : `${endpoint}/${encodeURIComponent(phoneOrUserId)}`,
        {
          method,
          ...(method === "POST"
            ? { body: JSON.stringify({ phone: phoneOrUserId }) }
            : {}),
        },
      );
      if (!response.ok)
        throw new Error(
          await getApiErrorMessage(
            response,
            "Хэрэглэгчийн эрхийг хадгалж чадсангүй.",
          ),
        );
      setMessage(
        method === "POST"
          ? "Зөвхөн мэдээлэл харах эрх олголоо."
          : "Харах эрхийг цуцаллаа.",
      );
      await load();
      return true;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Сервертэй холбогдож чадсангүй.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };
  return {
    members,
    loading,
    busy,
    error,
    message,
    reload: load,
    add: (phone: string) => mutate(phone, "POST"),
    remove: (userId: string) => mutate(userId, "DELETE"),
  };
}
