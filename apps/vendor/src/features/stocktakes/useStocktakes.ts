"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  StocktakeNewProduct,
  StocktakeLineDto,
  StocktakeCountEdit,
  StocktakeDetail,
  StocktakeKind,
  StocktakeOverview,
} from "@mgl/types";
import { API, authFetch } from "@/lib/api";
import { notifyProductCatalogChanged } from "@/lib/product-catalog-events";
import { parseVendorSessionUser } from "@/features/session/vendor-session.model";

async function request<T>(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await authFetch(url, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const error: unknown = await response.json().catch(() => null);
    throw new Error(
      error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string"
        ? error.message
        : "Сервертэй холбогдож чадсангүй",
    );
  }
  return response.json() as Promise<T>;
}
import { confirmStocktakeSave } from "./confirm-stocktake-save";
import { saveStocktakeEdits } from "./save-stocktake-edits";
import { useConfirmation } from "./useConfirmation";

type Edits = Record<string, StocktakeCountEdit>;
export function useStocktakes() {
  const confirmation = useConfirmation();
  const [organizationId, setOrganizationId] = useState("");
  const [overview, setOverview] = useState<StocktakeOverview | null>(null);
  const [session, setSession] = useState<StocktakeDetail | null>(null);
  const [edits, setEdits] = useState<Edits>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const creationId = useRef("");
  const base = `${API}/pos/stocktakes/${organizationId}`;
  const dirty = Object.keys(edits).length > 0;
  const draftKey = session
    ? `stocktake-draft:${organizationId}:${session.id}`
    : null;
  useEffect(() => {
    try {
      setOrganizationId(
        parseVendorSessionUser(
          JSON.parse(localStorage.getItem("vendor_user") || "null"),
        ).organizationId || "",
      );
    } catch {
      setError("Байгууллага сонгож дахин нэвтэрнэ үү");
    }
  }, []);
  const reload = useCallback(async () => {
    const data = await request<StocktakeOverview>(base);
    if (
      !Number.isInteger(data.directProductCount) ||
      data.directProductCount < 0 ||
      !Array.isArray(data.warehouses) ||
      data.warehouses.some(
        (warehouse) =>
          !Number.isInteger(warehouse.productCount) ||
          warehouse.productCount < 0,
      )
    ) {
      throw new Error(
        "Тоолох барааны тоог авч чадсангүй. Дахин холбогдоно уу.",
      );
    }
    setOverview(data);
  }, [base]);
  useEffect(() => {
    if (organizationId)
      void reload().catch((error) =>
        setError(error instanceof Error ? error.message : "Ачаалж чадсангүй"),
      );
  }, [organizationId, reload]);
  const latestDraft = useRef<{ key: string; value: string } | null>(null);
  latestDraft.current =
    draftKey && session && dirty
      ? {
          key: draftKey,
          value: JSON.stringify({ version: session.version, edits }),
        }
      : null;
  useEffect(
    () => () => {
      const draft = latestDraft.current;
      if (draft) {
        try {
          localStorage.setItem(draft.key, draft.value);
        } catch {
          /* The visible save warning remains the primary persistence contract. */
        }
      }
    },
    [],
  );
  useEffect(() => {
    if (!draftKey || !session || !dirty) return;
    const persist = () => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ version: session.version, edits }),
        );
      } catch {
        setError(
          "Түр хадгалах зай хүрэлцэхгүй байна. «Хадгалах» товчийг дарна уу.",
        );
      }
    };
    const timer = setTimeout(persist, 250);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      persist();
      event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [draftKey, dirty, edits, session]);
  const run = async (work: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Үйлдэл амжилтгүй боллоо",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const open = (id: string) =>
    run(async () => {
      if (
        dirty &&
        !(await confirmation.ask(
          "Хадгалаагүй өөрчлөлт байна. Серверээс дахин ачаалах уу?",
        ))
      )
        return;
      const detail = await request<StocktakeDetail>(`${base}/${id}`);
      let restored: Edits = {};
      const raw = localStorage.getItem(
        `stocktake-draft:${organizationId}:${id}`,
      );
      if (raw && detail.status === "DRAFT") {
        try {
          const draft: unknown = JSON.parse(raw);
          if (
            draft &&
            typeof draft === "object" &&
            "version" in draft &&
            "edits" in draft &&
            draft.edits &&
            typeof draft.edits === "object"
          ) {
            if (draft.version === detail.version) {
              const ids = new Set(detail.lines.map((line) => line.id));
              for (const row of Object.values(draft.edits)) {
                if (
                  row &&
                  typeof row === "object" &&
                  "id" in row &&
                  typeof row.id === "string" &&
                  ids.has(row.id) &&
                  "counted" in row &&
                  (row.counted === null ||
                    (typeof row.counted === "number" &&
                      Number.isInteger(row.counted) &&
                      row.counted >= 0)) &&
                  "note" in row &&
                  typeof row.note === "string"
                )
                  restored[row.id] = {
                    id: row.id,
                    counted: row.counted,
                    note: row.note,
                  };
              }
              setNotice(
                "Энэ төхөөрөмжийн хадгалаагүй тоонуудыг сэргээлээ. Шалгаад серверт хадгална уу.",
              );
            } else
              setNotice(
                "Серверийн хувилбар өөрчлөгдсөн тул төхөөрөмжийн хуучин тоог автоматаар сэргээгээгүй. Дахин тоолж шалгана уу.",
              );
          }
        } catch {
          setNotice(
            "Түр хадгалсан мэдээллийг уншиж чадсангүй. Серверийн тоог харуулж байна.",
          );
        }
      }
      setSession(detail);
      setEdits(restored);
    });
  const create = (
    title: string,
    warehouseId: string | null,
    kind: StocktakeKind,
  ) =>
    run(async () => {
      creationId.current ||= crypto.randomUUID();
      setSession(
        await request<StocktakeDetail>(base, "POST", {
          id: creationId.current,
          title,
          warehouseId,
          kind,
        }),
      );
      creationId.current = "";
      setEdits({});
      await reload();
    });
  const saveEdits = async (
    current: StocktakeDetail,
    values = Object.values(edits),
  ): Promise<StocktakeDetail> => {
    const updated = await saveStocktakeEdits(
      current,
      values,
      (version, batch) =>
        confirmStocktakeSave(
          version,
          batch,
          () =>
            request<StocktakeDetail>(`${base}/${current.id}`, "PATCH", {
              action: "save",
              version,
              edits: batch,
            }),
          () => request<StocktakeDetail>(`${base}/${current.id}`),
        ),
      (detail, batch) => {
        setSession(detail);
        setEdits((previous) => {
          const remaining = { ...previous };
          for (const row of batch) delete remaining[row.id];
          return remaining;
        });
      },
    );
    latestDraft.current = null;
    if (draftKey) localStorage.removeItem(draftKey);
    return updated;
  };
  const saveCount = async (edit: StocktakeCountEdit): Promise<void> => {
    if (pending.current || !session || session.status !== "DRAFT")
      throw new Error("Өөр үйлдэл дуусахыг хүлээгээд дахин оролдоно уу.");
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const values = Object.values({ ...edits, [edit.id]: edit });
    setEdits((previous) => ({ ...previous, [edit.id]: edit }));
    try {
      await saveEdits(session, values);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const resolveProduct = async (
    query: string,
  ): Promise<StocktakeLineDto | null | undefined> => {
    let result: StocktakeLineDto | null | undefined;
    await run(async () => {
      if (!session) return;
      const current = await saveEdits(session);
      const response = await request<{
        session: StocktakeDetail | null;
        line: StocktakeLineDto | null;
      }>(`${base}/${session.id}/lookup`, "POST", {
        query,
        version: current.version,
      });
      if (response.session) setSession(response.session);
      result = response.line;
    });
    return result;
  };
  const addProduct = async (product: StocktakeNewProduct): Promise<boolean> => {
    let saved = false;
    await run(async () => {
      if (!session) return;
      const current = await saveEdits(session);
      const updated = await request<StocktakeDetail>(
        `${base}/${session.id}/products`,
        "POST",
        { version: current.version, product },
      );
      setSession(updated);
      setNotice("Барааг бүртгэж, өнөөдрийн хүлээн авалтын баримт үүсгэлээ.");
      notifyProductCatalogChanged();
      saved = true;
      await reload();
    });
    return saved;
  };
  const edit = useCallback((value: StocktakeCountEdit) => {
    if (!pending.current)
      setEdits((previous) => ({ ...previous, [value.id]: value }));
  }, []);
  const act = (
    action: "save" | "submit" | "reopen" | "refresh" | "approve" | "cancel",
  ) =>
    run(async () => {
      if (!session) return;
      if (action !== "save" && dirty)
        throw new Error("Эхлээд өөрчлөлтөө хадгална уу");
      if (
        ["approve", "cancel", "refresh"].includes(action) &&
        !(await confirmation.ask(
          action === "approve"
            ? "Хянасан зөрүүгээр бодит үлдэгдлийг шинэчилж баталгаажуулах уу? Энэ үйлдлийг буцаахгүй."
            : action === "refresh"
              ? "Үлдэгдэл нь өөрчлөгдсөн барааны тоог цэвэрлэж дахин тоолох уу? Өөрчлөгдөөгүй мөрүүд хэвээр үлдэнэ."
              : "Тооллогыг цуцлах уу? Үлдэгдэл өөрчлөгдөхгүй.",
        ))
      )
        return;
      let updated = session;
      if (action === "save") {
        updated = await saveEdits(session);
      } else
        updated = await request<StocktakeDetail>(
          `${base}/${session.id}`,
          "PATCH",
          { action, version: session.version },
        );
      latestDraft.current = null;
      if (draftKey) localStorage.removeItem(draftKey);
      setSession(updated);
      setNotice(
        action === "approve"
          ? "Тооллого баталгаажиж, үлдэгдэл болон хөдөлгөөний түүх шинэчлэгдлээ."
          : "Амжилттай хадгаллаа.",
      );
      if (action === "approve") notifyProductCatalogChanged();
      await reload();
    });
  const close = () =>
    run(async () => {
      if (
        !dirty ||
        (await confirmation.ask(
          "Хадгалаагүй тоо энэ төхөөрөмжид түр хадгалагдана. Жагсаалт руу буцах уу?",
        ))
      ) {
        const draft = latestDraft.current;
        if (draft) {
          try {
            localStorage.setItem(draft.key, draft.value);
          } catch {
            setError("Түр хадгалж чадсангүй. Серверт хадгалаад гарна уу.");
            return;
          }
        }
        setSession(null);
        setEdits({});
      }
    });
  return {
    confirmation,
    overview,
    session,
    edits,
    busy,
    error,
    notice,
    dirty,
    create,
    addProduct,
    resolveProduct,
    saveCount,
    edit,
    act,
    open,
    close,
    reload: () => run(reload),
    setError,
  };
}
