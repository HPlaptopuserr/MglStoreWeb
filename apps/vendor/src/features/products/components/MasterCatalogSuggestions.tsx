"use client";
import { MasterCatalogSuggestions as SharedCatalogSuggestions, type MasterCatalogSuggestionsProps } from "@mgl/ui";
import { API, authFetch } from "@/lib/api";
export function MasterCatalogSuggestions(props: Omit<MasterCatalogSuggestionsProps, "apiBase" | "fetcher">) {
  return <SharedCatalogSuggestions {...props} apiBase={API} fetcher={authFetch} />;
}
