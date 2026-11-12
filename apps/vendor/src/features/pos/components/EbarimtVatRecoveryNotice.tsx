"use client";

import { useEffect, useRef, useState } from "react";
import {
  isVatRecoveryRegister,
  loadVatRecovery,
  recoverVatReceipts,
  type VatRecoveryList,
} from "../api/ebarimt-vat-recovery";
import type { RegisterConfig } from "../types/pos.types";

export function EbarimtVatRecoveryNotice({
  register,
  idle,
}: {
  register: RegisterConfig;
  idle: boolean;
}) {
  const [list, setList] = useState<VatRecoveryList | null>(null);
  const [message, setMessage] = useState("");
  const [running, setRunning] = useState(false);
  const attempted = useRef(false);
  const idleRef = useRef(idle);
  idleRef.current = idle;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = async () => {
    if (!idleRef.current || running) return;
    attempted.current = true;
    setRunning(true);
    setMessage("Өмнөх алдаатай баримтуудыг PosAPI-тай тулгаж байна…");
    try {
      const result = await recoverVatReceipts(
        register,
        () => mounted.current && idleRef.current,
        (text) => {
          if (mounted.current) setMessage(text);
        },
      );
      if (mounted.current) {
        setList(result);
        setMessage("");
      }
    } catch (error: unknown) {
      if (mounted.current) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Баримтуудыг сэргээж чадсангүй.",
        );
        void loadVatRecovery()
          .then((result) => {
            if (mounted.current) setList(result);
          })
          .catch(() => {});
      }
    } finally {
      if (mounted.current) setRunning(false);
    }
  };

  useEffect(() => {
    if (!isVatRecoveryRegister(register.id) || !idle || attempted.current)
      return;
    // Give checkout initialization and Strict Mode cleanup time to settle.
    const timer = window.setTimeout(() => {
      void run();
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [register, idle]);

  if (!isVatRecoveryRegister(register.id)) return null;
  const completed =
    list?.receipts.filter((entry) => entry.state === "COMPLETED").length ?? 0;
  const uncertain =
    list?.receipts.filter((entry) => entry.state === "SUBMITTED").length ?? 0;
  const total = list?.total ?? 25;
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-3 rounded-xl border border-cyan-700 bg-cyan-950 px-4 py-3 text-sm text-cyan-100"
    >
      <p className="font-semibold">
        Өмнөх НӨАТ-ын алдаатай баримт: {completed}/{total} сэргэсэн
      </p>
      {message && <p className="mt-1">{message}</p>}
      {uncertain > 0 && (
        <p className="mt-1">
          {uncertain} баримтын хариуг нягтлах шаардлагатай. Давтан илгээхгүй.
        </p>
      )}
      {!running && completed < total && (
        <button
          type="button"
          disabled={!idle}
          onClick={() => void run()}
          className="mt-2 rounded-lg border border-cyan-600 px-3 py-2 font-semibold hover:bg-cyan-900 focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-50"
        >
          {!idle
            ? "Одоогийн борлуулалт дуусахыг хүлээнэ"
            : "Баримтын төлөв шалгаж үргэлжлүүлэх"}
        </button>
      )}
      {!running && list && completed < total && uncertain === 0 && !message && (
        <p className="mt-1">
          Өмнөх баримтын төлөв баталгаажаагүй тул дахин илгээгээгүй.
          Шинэ борлуулалтаа хэвийн үргэлжлүүлж болно.
        </p>
      )}
    </div>
  );
}
