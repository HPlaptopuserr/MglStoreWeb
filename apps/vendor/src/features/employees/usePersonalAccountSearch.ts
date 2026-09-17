"use client";

import { useEffect, useState } from "react";
import { employeeApi, employeeErrorMessage } from "./store-employee.api";
import type { PersonalAccount } from "./store-employee.model";

type SearchResult =
  | { status: "idle" | "loading" }
  | { status: "success"; accounts: PersonalAccount[] }
  | { status: "error"; error: string };

interface SearchRequest {
  organizationId: string;
  query: string;
  attempt: number;
  result: SearchResult;
}

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DELAY_MS = 300;

export function usePersonalAccountSearch(
  organizationId: string,
  query: string,
) {
  const term = query.trim();
  const [attempt, setAttempt] = useState(0);
  const [request, setRequest] = useState<SearchRequest | null>(null);

  useEffect(() => {
    if (term.length < MIN_SEARCH_LENGTH) return;
    const controller = new AbortController();
    const current = { organizationId, query: term, attempt };
    const timer = setTimeout(async () => {
      setRequest({ ...current, result: { status: "loading" } });
      try {
        const accounts = await employeeApi.search(
          organizationId,
          term,
          controller.signal,
        );
        if (!controller.signal.aborted)
          setRequest({ ...current, result: { status: "success", accounts } });
      } catch (error) {
        if (!controller.signal.aborted)
          setRequest({
            ...current,
            result: { status: "error", error: employeeErrorMessage(error) },
          });
      }
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [organizationId, term, attempt]);

  let result: SearchResult = { status: "loading" };
  if (term.length < MIN_SEARCH_LENGTH) {
    result = { status: "idle" };
  } else if (
    request?.organizationId === organizationId &&
    request.query === term &&
    request.attempt === attempt
  ) {
    result = request.result;
  }

  return { ...result, retry: () => setAttempt((value) => value + 1) };
}
