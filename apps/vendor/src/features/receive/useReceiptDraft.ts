"use client";

import { useEffect, useRef, useState } from "react";
import {
  hasReceiptDraft,
  parseReceiptDraft,
  type ReceiptDraft,
} from "./receipt-draft";

export function useReceiptDraft(
  draft: ReceiptDraft,
  restore: (draft: ReceiptDraft) => void,
  getScope: () => string,
) {
  const latest = useRef(draft);
  latest.current = draft;
  const restoreRef = useRef(restore);
  restoreRef.current = restore;
  const [key, setKey] = useState("");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const scope = getScope();
    if (!scope) return;
    const storageKey = `vendor-receipt-draft:v1:${scope}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = parseReceiptDraft(raw);
        if (saved) {
          restoreRef.current(saved);
          setStatus("Хадгалсан нооргийг сэргээлээ.");
        } else {
          setStatus("Хадгалсан нооргийг уншиж чадсангүй.");
          return;
        }
      }
      setKey(storageKey);
      setReady(true);
    } catch {
      setStatus(
        "Ноорог хадгалах сан руу хандаж чадсангүй. Энэ цонхоо бүү хаагаарай.",
      );
    }
  }, [getScope]);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (!ready || !key) return;
    const save = () => {
      try {
        if (hasReceiptDraft(latest.current)) {
          localStorage.setItem(
            key,
            JSON.stringify({ version: 1, draft: latest.current }),
          );
          setStatus("Ноорог энэ төхөөрөмж дээр автоматаар хадгалагдсан.");
        } else {
          localStorage.removeItem(key);
          setStatus("");
        }
      } catch {
        setStatus("Ноорог хадгалж чадсангүй. Энэ цонхоо бүү хаагаарай.");
      }
    };
    save();
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, [draft, key, ready]);

  return { status, offline };
}
