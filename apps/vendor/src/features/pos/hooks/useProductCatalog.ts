"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { API } from "@/lib/api";
import {
  CATALOG_CHANGE_EVENT,
  CATALOG_CHANGE_STORAGE_KEY,
  notifyProductCatalogChanged,
  readCatalogChangedAt,
} from "@/lib/product-catalog-events";
import { getPosCatalog } from "../api/get-pos-products";
import { getOwnCatalog } from "../api/get-own-products";
import {
  catalogKey,
  CATALOG_FRESH_MS,
  isRecord,
} from "../catalog/catalog-model";
import { CatalogResource, EMPTY_CATALOG } from "../catalog/catalog-resource";
import { catalogStorage } from "../catalog/catalog-storage";

const resources = new Map<string, CatalogResource>();
const getEmpty = () => EMPTY_CATALOG;
const subscribeEmpty = () => () => undefined;
const getServerSession = () => null;
type CatalogKind = "branch" | "organization";

function readSession() {
  try {
    return localStorage.getItem("vendor_token")
      ? localStorage.getItem("vendor_user")
      : null;
  } catch {
    return null;
  }
}

function subscribeSession(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === "vendor_token" ||
      event.key === "vendor_user" ||
      event.key === null
    )
      listener();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function getBinding(kind: CatalogKind, id: string, session: string | null) {
  if (!id || !session) return null;
  let user: unknown;
  try {
    user = JSON.parse(session);
  } catch {
    return null;
  }
  if (
    !isRecord(user) ||
    typeof user.id !== "string" ||
    typeof user.organizationId !== "string"
  )
    return null;
  const organizationId = user.organizationId;
  const userId = user.id;
  const key = catalogKey({ api: API, userId, organizationId, kind, id });
  let resource = resources.get(key);
  if (!resource) {
    resource = new CatalogResource(
      key,
      async (signal, etag) => {
        const sameSession = () => {
          const latest: unknown = JSON.parse(readSession() || "null");
          return (
            isRecord(latest) &&
            latest.id === userId &&
            latest.organizationId === organizationId
          );
        };
        if (!sameSession())
          throw new Error("Дэлгүүрийн нэвтрэлт өөрчлөгдсөн байна.");
        const response = await (kind === "branch"
          ? getPosCatalog(id, signal, etag, organizationId)
          : getOwnCatalog(id, signal, etag));
        if (!sameSession())
          throw new Error("Дэлгүүрийн нэвтрэлт өөрчлөгдсөн байна.");
        return response;
      },
      catalogStorage,
    );
    resources.set(key, resource);
  }
  return { organizationId, resource };
}

export function useProductCatalog(kind: CatalogKind, id: string) {
  const session = useSyncExternalStore(
    subscribeSession,
    readSession,
    getServerSession,
  );
  const binding = useMemo(
    () => getBinding(kind, id, session),
    [kind, id, session],
  );
  const resource = binding?.resource;
  const state = useSyncExternalStore(
    resource?.subscribe ?? subscribeEmpty,
    resource?.getSnapshot ?? getEmpty,
    getEmpty,
  );

  useEffect(() => {
    if (!binding) return;
    const { resource: active, organizationId } = binding;
    void active.start(readCatalogChangedAt(organizationId));
    const refresh = () => {
      if (document.visibilityState === "visible") void active.refresh();
    };
    const invalidate = (detail: unknown) => {
      if (isRecord(detail) && detail.organizationId === organizationId)
        void active.refresh(true);
    };
    const onChange = (event: Event) =>
      invalidate((event as CustomEvent<unknown>).detail);
    const onStorage = (event: StorageEvent) => {
      if (event.key === CATALOG_CHANGE_STORAGE_KEY && event.newValue) {
        try {
          invalidate(JSON.parse(event.newValue));
        } catch {
          /* Ignore malformed notifications. */
        }
      }
    };
    const timer = window.setInterval(refresh, CATALOG_FRESH_MS);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener(CATALOG_CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener(CATALOG_CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [binding]);

  const reload = useCallback(() => {
    if (binding) notifyProductCatalogChanged(binding.organizationId);
  }, [binding]);
  const refreshProducts = useCallback(async () => {
    if (!resource)
      throw new Error("Барааны жагсаалт хараахан бэлэн болоогүй байна.");
    await resource.refresh(!resource.getSnapshot().refreshing);
    const latest = resource.getSnapshot();
    if (latest.error || !latest.hasSnapshot)
      throw new Error(latest.error || "Барааны жагсаалтыг шалгаж чадсангүй.");
    return latest.products;
  }, [resource]);

  return {
    ...state,
    loading: Boolean(id) && !state.hasSnapshot && !state.error,
    reload,
    refreshProducts,
  };
}
