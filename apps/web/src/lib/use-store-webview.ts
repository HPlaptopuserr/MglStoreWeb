"use client";

import { useSyncExternalStore } from "react";

// The native WebView adds this suffix before loading the first page.
const subscribe = () => () => {};
const readUserAgent = () => navigator.userAgent.includes("MGLStoreApp/");
const serverSnapshot = () => false;

export function useStoreWebView() {
  return useSyncExternalStore(subscribe, readUserAgent, serverSnapshot);
}

const readStudyNavigation = () =>
  readUserAgent() && navigator.userAgent.includes("StudyNav/1");

export function useStudyNavigation() {
  return useSyncExternalStore(subscribe, readStudyNavigation, serverSnapshot);
}
