"use client";

import { useEffect } from "react";

let lockCount = 0;
let savedScrollY = 0;
let savedBodyStyles: Partial<CSSStyleDeclaration> = {};
let savedHtmlStyles: Partial<CSSStyleDeclaration> = {};

function lockBodyScroll() {
  if (typeof window === "undefined") return;

  lockCount += 1;
  if (lockCount > 1) return;

  const { body, documentElement } = document;
  savedScrollY = window.scrollY || documentElement.scrollTop || 0;
  savedBodyStyles = {
    overflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    paddingRight: body.style.paddingRight,
    overscrollBehavior: body.style.overscrollBehavior,
  };
  savedHtmlStyles = {
    overflow: documentElement.style.overflow,
    overscrollBehavior: documentElement.style.overscrollBehavior,
  };

  const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
  documentElement.style.overflow = "hidden";
  documentElement.style.overscrollBehavior = "none";
  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${savedScrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
  body.style.overscrollBehavior = "none";
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

function unlockBodyScroll() {
  if (typeof window === "undefined" || lockCount === 0) return;

  lockCount -= 1;
  if (lockCount > 0) return;

  const { body, documentElement } = document;
  documentElement.style.overflow = savedHtmlStyles.overflow || "";
  documentElement.style.overscrollBehavior =
    savedHtmlStyles.overscrollBehavior || "";
  body.style.overflow = savedBodyStyles.overflow || "";
  body.style.position = savedBodyStyles.position || "";
  body.style.top = savedBodyStyles.top || "";
  body.style.left = savedBodyStyles.left || "";
  body.style.right = savedBodyStyles.right || "";
  body.style.width = savedBodyStyles.width || "";
  body.style.paddingRight = savedBodyStyles.paddingRight || "";
  body.style.overscrollBehavior = savedBodyStyles.overscrollBehavior || "";
  window.scrollTo(0, savedScrollY);
}

export function useLockBodyScroll(active = true) {
  useEffect(() => {
    if (!active) return;
    lockBodyScroll();
    return unlockBodyScroll;
  }, [active]);
}
