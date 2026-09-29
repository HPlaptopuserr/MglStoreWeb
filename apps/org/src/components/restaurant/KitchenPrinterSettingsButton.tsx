"use client";

import { Loader2, Printer, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  getLocalPrinterInventory,
  loadKitchenPrinterSettings,
  printKitchenTicket,
  saveKitchenPrinterSettings,
  type KitchenPrinterSettings,
} from "@/lib/kitchen-ticket-printing";

export function KitchenPrinterSettingsButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [defaultPrinter, setDefaultPrinter] = useState("");
  const [settings, setSettings] = useState<KitchenPrinterSettings>(() => ({
    enabled: false,
    printerName: "",
    paperWidthMm: 80,
  }));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSettings(loadKitchenPrinterSettings());
    setMessage("");
    setError("");
    setLoading(true);
    void getLocalPrinterInventory()
      .then((inventory) => {
        setPrinters(inventory.printers);
        setDefaultPrinter(inventory.defaultPrinter);
        setSettings((current) => ({
          ...current,
          printerName:
            current.printerName ||
            inventory.printers.find(
              (printer) => printer !== inventory.defaultPrinter,
            ) ||
            inventory.defaultPrinter ||
            inventory.printers[0] ||
            "",
        }));
      })
      .catch(() => {
        setError(
          "Принтерийн локал үйлчилгээ хуучин эсвэл ажиллахгүй байна. Kiosk setup-ийг шинэчлээд кассаа дахин асаана уу.",
        );
      })
      .finally(() => setLoading(false));
  }, [open]);

  const save = () => {
    if (settings.enabled && !settings.printerName) {
      setError("Гал тогооны принтерээ сонгоно уу.");
      return;
    }
    saveKitchenPrinterSettings(settings);
    setError("");
    setMessage("Гал тогооны принтерийн тохиргоо хадгалагдлаа.");
  };

  const test = async () => {
    if (!settings.printerName) {
      setError("Эхлээд принтерээ сонгоно уу.");
      return;
    }
    setTesting(true);
    setError("");
    setMessage("");
    try {
      await printKitchenTicket(
        {
          heading: "ГАЛ ТОГООНЫ ЗАХИАЛГА",
          organizationName: "MGL Store",
          registerName: "Өөртөө үйлчлэх касс",
          ticketNo: "000",
          orderLabel: "ТЕСТ ХЭВЛЭЛТ",
          createdAt: new Date().toLocaleString("mn-MN"),
          items: [{ name: "Гал тогооны принтерийн тест", qty: 1 }],
        },
        { ...settings, enabled: true },
      );
      setMessage("Тест захиалга хэвлэгдлээ.");
    } catch (testError) {
      setError(
        testError instanceof Error
          ? testError.message
          : "Тест хэвлэлт амжилтгүй боллоо.",
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-11 w-11 place-items-center rounded-2xl border border-black/5 bg-white/80 text-slate-500 transition hover:text-slate-950"
        aria-label="Гал тогооны принтерийн тохиргоо"
        title="Гал тогооны принтер"
      >
        <Printer className="h-5 w-5" />
      </button>

      {open
        ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 text-left shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Гал тогооны принтер</h2>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
                  Төлбөр амжилттай болмогц захиалгын дугаар, хоолны нэр ба тоог
                  тусдаа принтер рүү хэвлэнэ.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"
                aria-label="Хаах"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loading ? (
              <div className="mt-6 flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-4 text-sm font-bold text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Принтерүүдийг уншиж байна...
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3">
                  <span className="text-sm font-black">Автоматаар хэвлэх</span>
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        enabled: event.target.checked,
                      }))
                    }
                    className="h-5 w-5 accent-emerald-700"
                  />
                </label>

                <label className="block text-sm font-black">
                  Принтер
                  <select
                    value={settings.printerName}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        printerName: event.target.value,
                      }))
                    }
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-700"
                  >
                    <option value="">Сонгох</option>
                    {printers.map((printer) => (
                      <option key={printer} value={printer}>
                        {printer}
                        {printer === defaultPrinter
                          ? " (баримтын үндсэн принтер)"
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <p className="text-sm font-black">Цаасны өргөн</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {([58, 80] as const).map((width) => (
                      <button
                        key={width}
                        type="button"
                        onClick={() =>
                          setSettings((current) => ({
                            ...current,
                            paperWidthMm: width,
                          }))
                        }
                        className={`h-11 rounded-xl border text-sm font-black ${
                          settings.paperWidthMm === width
                            ? "border-[#11231d] bg-[#11231d] text-white"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        {width} мм
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error ? (
              <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold leading-5 text-rose-700">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                {message}
              </p>
            ) : null}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void test()}
                disabled={loading || testing || !settings.printerName}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-black disabled:opacity-40"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Тест хэвлэх
              </button>
              <button
                type="button"
                onClick={save}
                disabled={loading}
                className="h-12 rounded-xl bg-[#11231d] text-sm font-black text-white disabled:opacity-40"
              >
                Хадгалах
              </button>
            </div>
          </div>
        </div>,
            document.body,
          )
        : null}
    </>
  );
}
