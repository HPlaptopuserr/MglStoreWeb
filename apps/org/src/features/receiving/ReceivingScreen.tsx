"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useOrg } from "@/components/org/OrgContext";
import { API, authFetch } from "@/lib/api";
type ReceivingRegister = {
  id: string;
  name: string;
  label: string | null;
  branch: { name: string };
};

type Product = {
  id: string;
  name: string;
  measureUnit: string;
  supplyType: string;
  price: number;
  isRestaurantMenuItem: boolean;
};
type Dispatch = {
  id: string;
  dispatchNumber: string;
  warehouseName: string;
  status: string;
  receivedAt: string | null;
  items: Array<{ id: string; name: string; quantity: number; unit: string }>;
};

class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authFetch(`${API}${path}`, {
    cache: "no-store",
    ...init,
  });
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    throw new RequestError(
      data &&
        typeof data === "object" &&
        "message" in data &&
        typeof data.message === "string"
        ? data.message
        : "Мэдээлэл авахад алдаа гарлаа",
      response.status,
    );
  }
  return response.json() as Promise<T>;
}

const field =
  "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm disabled:opacity-50";
const action =
  "min-h-11 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";

export function ReceivingScreen({ preorder = false }: { preorder?: boolean }) {
  const { user } = useOrg();
  const [registers, setRegisters] = useState<ReceivingRegister[]>([]);
  const [registerId, setRegisterId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Keep the same payload and identifier after a lost response to avoid duplicate stock.
  const pendingReceipt = useRef<{
    requestId: string;
    registerId: string;
    productId: string;
    quantity: number;
  } | null>(null);

  const load = useCallback(async () => {
    if (!user.organizationId) return;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({
        organizationId: user.organizationId,
        includeAllSupplyTypes: "1",
      });
      const [nextRegisters, nextProducts, nextDispatches] = await Promise.all([
        request<ReceivingRegister[]>("/pos/receiving-registers"),
        request<Product[]>(`/pos/products?${query}`),
        request<Dispatch[]>(
          `/pos/incoming-dispatches?organizationId=${encodeURIComponent(user.organizationId)}`,
        ),
      ]);
      const available = nextRegisters;
      setRegisters(available);
      setRegisterId((current) =>
        available.some((r) => r.id === current)
          ? current
          : available[0]?.id || "",
      );
      setProducts(
        nextProducts.filter((p) =>
          preorder
            ? p.supplyType === "CHINA_PREORDER"
            : p.supplyType === "IN_STOCK",
        ),
      );
      setDispatches(nextDispatches);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Мэдээлэл авч чадсангүй",
      );
    } finally {
      setLoading(false);
    }
  }, [user.organizationId, preorder]);

  useEffect(() => {
    void load();
  }, [load]);

  const receive = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const amount = Number(quantity);
    if (
      !pendingReceipt.current &&
      (!registerId || !productId || !Number.isFinite(amount) || amount <= 0)
    ) {
      setError("Касс, бараа болон хүлээн авах тоо хэмжээгээ шалгана уу");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    pendingReceipt.current ??= {
      requestId: crypto.randomUUID(),
      registerId,
      productId,
      quantity: amount,
    };
    try {
      const result = await request<{ receiptNo: string }>(
        "/pos/quick-restock",
        {
          method: "POST",
          body: JSON.stringify(pendingReceipt.current),
        },
      );
      pendingReceipt.current = null;
      setQuantity("");
      setNotice(`Хүлээн авалт бүртгэгдлээ: ${result.receiptNo}`);
    } catch (cause) {
      if (
        cause instanceof RequestError &&
        cause.status >= 400 &&
        cause.status < 500
      )
        pendingReceipt.current = null;
      setError(
        cause instanceof Error
          ? cause.message
          : "Хүлээн авалт бүртгэж чадсангүй",
      );
    } finally {
      setBusy(false);
    }
  };

  const acknowledge = async (dispatch: Dispatch) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await request<{ receivedAt: string }>(
        `/pos/incoming-dispatches/${encodeURIComponent(dispatch.id)}/receive`,
        { method: "POST" },
      );
      setDispatches((current) =>
        current.map((d) =>
          d.id === dispatch.id ? { ...d, receivedAt: result.receivedAt } : d,
        ),
      );
      setNotice(
        `${dispatch.dispatchNumber} илгээлтийг хүлээн авснаар баталгаажууллаа.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Хүлээн авалт баталгаажуулж чадсангүй",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">
            {preorder ? "Захиалгын бараа" : "Нэгдсэн бараа"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Хоол, барааны орлого бүртгэх болон агуулахын илгээлт хүлээн авах.
            Барааны нэр, үнэ, мэдээлэл засахгүй.
          </p>
        </div>
        <button
          type="button"
          disabled={loading || busy}
          onClick={() => void load()}
          className={action}
        >
          Шинэчлэх
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status">Мэдээлэл ачаалж байна…</p>
      ) : (
        <>
          <form
            onSubmit={(event) => void receive(event)}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
          >
            <h2 className="text-lg font-bold">Хоол, бараа хүлээн авах</h2>
            <fieldset
              disabled={busy || Boolean(pendingReceipt.current)}
              className="grid gap-4 sm:grid-cols-2"
            >
              <label className="space-y-2 text-sm font-semibold">
                <span>Касс</span>
                <select
                  required
                  value={registerId}
                  onChange={(event) => setRegisterId(event.target.value)}
                  className={field}
                >
                  <option value="">Касс сонгох</option>
                  {registers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.branch.name} · {r.label || r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-semibold">
                <span>Хоол / бараа</span>
                <select
                  required
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  className={field}
                >
                  <option value="">Бараа сонгох</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.measureUnit}) · {p.price.toLocaleString()} ₮
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-semibold">
                <span>Хүлээн авах тоо хэмжээ</span>
                <input
                  required
                  type="number"
                  min="0.001"
                  max="1000000"
                  step="0.001"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className={field}
                />
              </label>
            </fieldset>
            {(!registers.length || !products.length) && (
              <p className="text-sm text-slate-500">
                {!registers.length
                  ? "Идэвхтэй касс бүртгэлгүй байна."
                  : "Хүлээн авах бүртгэлтэй бараа алга байна."}
              </p>
            )}
            {pendingReceipt.current && (
              <p className="text-sm text-slate-600">
                Өмнөх хүсэлтийн хариу баталгаажаагүй байна. Ижил хүлээн авалтыг
                дахин шалгана уу.
              </p>
            )}
            <button
              type="submit"
              disabled={
                busy ||
                (!pendingReceipt.current &&
                  (!registerId || !productId || !quantity))
              }
              className={action}
            >
              {busy
                ? "Бүртгэж байна…"
                : pendingReceipt.current
                  ? "Хүлээн авалтыг дахин шалгах"
                  : "Хүлээн авалт бүртгэх"}
            </button>
          </form>
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">Агуулахаас ирсэн илгээлт</h2>
            <p className="text-sm text-slate-600">
              Хүргэгч хүргэлтээ баримттайгаар баталгаажуулсны дараа хүлээн
              авснаа батална. Үлдэгдэл давхар нэмэгдэхгүй.
            </p>
            {!dispatches.length && (
              <p className="text-sm text-slate-500">
                Хүлээн авах илгээлт алга байна.
              </p>
            )}
            {dispatches.map((d) => (
              <article
                key={d.id}
                className="space-y-3 rounded-xl border border-slate-200 p-4"
              >
                <h3 className="font-bold">
                  {d.dispatchNumber} · {d.warehouseName}
                </h3>
                <ul className="space-y-1 text-sm text-slate-600">
                  {d.items.map((i) => (
                    <li key={i.id}>
                      {i.name} · {i.quantity} {i.unit}
                    </li>
                  ))}
                </ul>
                {d.receivedAt ? (
                  <p className="text-sm font-semibold text-emerald-700">
                    Хүлээн авсан ·{" "}
                    {new Date(d.receivedAt).toLocaleString("mn-MN")}
                  </p>
                ) : d.status !== "DELIVERED" ? (
                  <p className="text-sm text-amber-700">
                    Замд явж байна · Хүргэгчийн баталгааг хүлээж байна
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void acknowledge(d)}
                    className={action}
                  >
                    Хүлээн авснаа батлах
                  </button>
                )}
              </article>
            ))}
          </section>
        </>
      )}
    </section>
  );
}
