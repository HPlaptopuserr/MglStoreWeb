"use client";
import { useEffect, useState } from "react";
import { useAdminAuth } from "./admin-auth";
import { getApiErrorMessage } from "./api";

/** Abort previous requests and never display a response belonging to another URL. */
export function useAdminResource<T>(url: string) {
  const { authFetch } = useAdminAuth();
  const [revision, setRevision] = useState(0);
  const key = `${url}:${revision}`;
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    error: string | null;
  }>({ key: "", data: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await authFetch(url, { signal: controller.signal });
        if (!response.ok)
          throw new Error(
            await getApiErrorMessage(response, "Мэдээлэл ачаалагдсангүй"),
          );
        const data: T = await response.json();
        if (!controller.signal.aborted) setState({ key, data, error: null });
      } catch (error) {
        if (!controller.signal.aborted)
          setState({
            key,
            data: null,
            error:
              error instanceof Error
                ? error.message
                : "Мэдээлэл ачаалагдсангүй",
          });
      }
    }
    void load();
    return () => controller.abort();
  }, [authFetch, url, key]);
  return {
    data: state.key === key ? state.data : null,
    error: state.key === key ? state.error : null,
    loading: state.key !== key,
    reload: () => setRevision((value) => value + 1),
  };
}
