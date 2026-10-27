"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { PurchaseContract } from "@mgl/types";
import { responseError } from "@/features/building/api/management-client";
import { PurchaseContractDocument } from "./PurchaseContractDocument";
import { BuildingDialog } from "../management/BuildingDialog";
import "./purchases.css";
export function PurchaseContracts({ buyer = false }: { buyer?: boolean }) {
  const [contracts, setContracts] = useState<PurchaseContract[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  const base = buyer ? "buyer" : "admin";
  useEffect(() => {
    const c = new AbortController();
    void fetch(`/api/building/${base}/purchases`, {
      signal: c.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        if (r.status === 401) {
          window.location.assign(
            buyer ? "/building/buyer-login" : "/building/login",
          );
          return;
        }
        if (!r.ok)
          throw new Error(await responseError(r, "Гэрээнүүд ачаалсангүй"));
        const data = (await r.json()) as { contracts: PurchaseContract[] };
        if (!c.signal.aborted) setContracts(data.contracts);
      })
      .catch((e) => {
        if (!c.signal.aborted)
          setError(e instanceof Error ? e.message : "Алдаа");
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [base, buyer, revision]);
  const current = contracts.find((c) => c.id === selected);
  async function cancelPending() {
    if (
      !current ||
      !window.confirm(
        "Хүлээгдэж буй гэрээг цуцалж байрыг дахин боломжтой болгох уу?",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/building/admin/purchases/${current.id}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
      );
      if (!response.ok)
        throw new Error(await responseError(response, "Цуцалж чадсангүй"));
      const { contract } = (await response.json()) as {
        contract: PurchaseContract;
      };
      setContracts((rows) =>
        rows.map((row) => (row.id === contract.id ? contract : row)),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Алдаа");
    } finally {
      setBusy(false);
    }
  }
  async function approve() {
    if (!current) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        `/api/building/${base}/purchases/${current.id}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accepted }),
        },
      );
      if (!r.ok)
        throw new Error(await responseError(r, "Зөвшөөрөл хадгалагдсангүй"));
      const { contract } = (await r.json()) as { contract: PurchaseContract };
      setContracts((rows) =>
        rows.map((row) => (row.id === contract.id ? contract : row)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="purchase-contracts">
      <header>
        <h1>{buyer ? "Миний байрны захиалга" : "Захиалга ба гэрээнүүд"}</h1>
        {buyer && <Link href="/account/password?context=buyer&mode=change">Нууц үг солих</Link>}
        {!buyer && (
          <Link href="/building/manage/purchases/new">+ Байр захиалах</Link>
        )}
      </header>
      {loading ? (
        <p role="status">Ачаалж байна…</p>
      ) : (
        <div className="purchase-contract-list">
          {contracts.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelected(c.id);
                setAccepted(false);
                setError("");
              }}
            >
              <strong>
                {c.snapshot.block} · № {c.snapshot.unitNo}
              </strong>
              <span>{c.snapshot.customerName}</span>
              <small>
                {c.status === "COMPLETED"
                  ? "Хоёр тал зөвшөөрсөн"
                  : c.status === "CANCELLED"
                    ? "Цуцлагдсан"
                    : "Зөвшөөрөл хүлээгдэж байна"}
              </small>
              <span>Дэлгэрэнгүй →</span>
            </button>
          ))}
          {!contracts.length && <p>Гэрээ хараахан үүсээгүй байна.</p>}
        </div>
      )}
      {error && !current && (
        <p role="alert">
          {error}
          <button
            onClick={() => {
              setError("");
              setLoading(true);
              setRevision((r) => r + 1);
            }}
          >
            Дахин оролдох
          </button>
        </p>
      )}
      {current && (
        <BuildingDialog
          title="Захиалгын гэрээ"
          subtitle={`№ ${current.id.slice(0, 8)}`}
          onClose={() => setSelected(null)}
        >
          <div className="purchase-flow">
            <PurchaseContractDocument
              snapshot={current.snapshot}
              id={current.id}
            />
            <div className="purchase-approvals">
              <p>
                Худалдагч:{" "}
                {current.sellerAcceptedAt
                  ? new Date(current.sellerAcceptedAt).toLocaleString("mn-MN", {
                      timeZone: "Asia/Ulaanbaatar",
                    }) + " · Зөвшөөрсөн"
                  : "Хүлээгдэж байна"}
              </p>
              <p>
                Худалдан авагч:{" "}
                {current.buyerAcceptedAt
                  ? new Date(current.buyerAcceptedAt).toLocaleString("mn-MN", {
                      timeZone: "Asia/Ulaanbaatar",
                    }) + " · Зөвшөөрсөн"
                  : "Хүлээгдэж байна"}
              </p>
            </div>
            {current.status === "PENDING" &&
              !(buyer ? current.buyerAcceptedAt : current.sellerAcceptedAt) && (
                <>
                  <label className="purchase-consent">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                    />{" "}
                    Энэ гэрээний нөхцөл, төлбөрийн хуваарийг уншиж зөвшөөрч
                    байна.
                  </label>
                  <button disabled={!accepted || busy} onClick={approve}>
                    {busy ? "Хадгалж байна…" : "Өөрийн эрхээр зөвшөөрөх"}
                  </button>
                </>
              )}
            {current.status === "COMPLETED" && (
              <p role="status">
                Гэрээ баталгаажсан.{" "}
                {buyer ? (
                  "Таны төлбөрийн хуваарь бүртгэгдлээ."
                ) : (
                  <Link href="/building/manage/customers">
                    Худалдан авагчийн бүртгэл харах →
                  </Link>
                )}
              </p>
            )}
            {!buyer && current.status === "PENDING" && (
              <button disabled={busy} onClick={cancelPending}>
                Гэрээг цуцлах
              </button>
            )}
            <button onClick={() => window.print()}>Гэрээ хэвлэх / PDF</button>
            {error && <p role="alert">{error}</p>}
          </div>
        </BuildingDialog>
      )}
    </main>
  );
}
