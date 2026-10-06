"use client";
import { useEffect, useRef, useState } from "react";
import { buttonClass, secondaryClass } from "./StocktakeOverview";
export function useConfirmation() {
  const [message, setMessage] = useState<string | null>(null);
  const resolve = useRef<((accepted: boolean) => void) | null>(null);
  useEffect(() => () => resolve.current?.(false), []);
  const ask = (text: string) =>
    new Promise<boolean>((done) => {
      if (resolve.current) {
        done(false);
        return;
      }
      resolve.current = done;
      setMessage(text);
    });
  const answer = (accepted: boolean) => {
    resolve.current?.(accepted);
    resolve.current = null;
    setMessage(null);
  };
  return { message, ask, answer };
}
export function StocktakeConfirmation({
  message,
  onAnswer,
}: {
  message: string | null;
  onAnswer: (accepted: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (message) dialog.current?.showModal();
    else dialog.current?.close();
  }, [message]);
  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        onAnswer(false);
      }}
      aria-labelledby="stocktake-confirm-title"
      aria-describedby="stocktake-confirm-message"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 p-6 shadow-2xl backdrop:bg-slate-950/50"
    >
      <h2 id="stocktake-confirm-title" className="text-lg font-bold">
        Үйлдлийг баталгаажуулах
      </h2>
      <p
        id="stocktake-confirm-message"
        className="mt-3 text-sm leading-6 text-slate-600"
      >
        {message}
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          autoFocus
          className={secondaryClass}
          onClick={() => onAnswer(false)}
        >
          Болих
        </button>
        <button className={buttonClass} onClick={() => onAnswer(true)}>
          Үргэлжлүүлэх
        </button>
      </div>
    </dialog>
  );
}
