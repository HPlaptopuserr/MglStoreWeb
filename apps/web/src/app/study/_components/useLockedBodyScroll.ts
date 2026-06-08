"use client";

import { useEffect } from "react";

export function useLockedBodyScroll() {
  useEffect(() => {
    const scrollY = window.scrollY;
    const bodyStyle = document.body.style;
    const htmlStyle = document.documentElement.style;
    const previousBody = {
      overflow: bodyStyle.overflow,
      position: bodyStyle.position,
      top: bodyStyle.top,
      width: bodyStyle.width,
    };
    const previousHtmlOverflow = htmlStyle.overflow;

    bodyStyle.overflow = "hidden";
    bodyStyle.position = "fixed";
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.width = "100%";
    htmlStyle.overflow = "hidden";

    return () => {
      bodyStyle.overflow = previousBody.overflow;
      bodyStyle.position = previousBody.position;
      bodyStyle.top = previousBody.top;
      bodyStyle.width = previousBody.width;
      htmlStyle.overflow = previousHtmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, []);
}
