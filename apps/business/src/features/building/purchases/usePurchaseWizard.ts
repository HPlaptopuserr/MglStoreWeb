"use client";
import { useState } from "react";
import {
  validatePurchaseTerms,
  type BuildingInventoryUnit,
  type PurchaseContract,
  type PurchaseScheduleRow,
  type PurchaseSnapshot,
} from "@mgl/types";
import { managementFetch, responseError } from "@/features/building/api/management-client";
export function usePurchaseWizard(unit: BuildingInventoryUnit) {
  const [step, setStep] = useState(0),
    [email, setEmail] = useState(""),
    [confirmedEmail, setConfirmedEmail] = useState(""),
    [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [total, setTotal] = useState(unit.priceTotal ?? ""),
    [terms, setTerms] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState<PurchaseContract | null>(null),
    [accepted, setAccepted] = useState(false);
  const [requestKey] = useState(() => crypto.randomUUID());
  const [rows, setRows] = useState<PurchaseScheduleRow[]>([
    { date: "", amount: "", kind: "DOWN_PAYMENT" },
  ]);
  const snapshot: PurchaseSnapshot = {
    unitId: unit.id,
    buyerEmail: email.trim().toLowerCase(),
    customerName: name,
    customerPhone: phone,
    total,
    terms,
    schedule: rows,
    requestKey,
    project: unit.floor.block.project.title,
    block: unit.floor.block.name,
    floor: unit.floor.number,
    unitNo: unit.unitNo,
    area: unit.areaM2,
    seller: "Төслийг эзэмшигч байгууллага",
  };
  async function selectBuyer() {
    setBusy(true);
    setError("");
    try {
      const r = await managementFetch("admin/purchases/buyer", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (!r.ok) throw new Error(await responseError(r, "Хэрэглэгч олдсонгүй"));
      setConfirmedEmail(email.trim().toLowerCase());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setError("");
    setBusy(true);
    try {
      validatePurchaseTerms(snapshot);
      const r = await managementFetch("admin/purchases", {
        method: "POST",
        body: JSON.stringify(snapshot),
      });
      if (!r.ok) throw new Error(await responseError(r, "Хадгалж чадсангүй"));
      const result = (await r.json()) as { contract: PurchaseContract };
      setSaved(result.contract);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setBusy(false);
    }
  }
  async function approveSeller() {
    if (!saved) return;
    setBusy(true);
    setError("");
    try {
      const r = await managementFetch(`admin/purchases/${saved.id}/accept`, {
        method: "POST",
        body: JSON.stringify({ accepted }),
      });
      if (!r.ok) throw new Error(await responseError(r, "Баталж чадсангүй"));
      setSaved(((await r.json()) as { contract: PurchaseContract }).contract);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setBusy(false);
    }
  }
  return {
    step,
    setStep,
    email,
    setEmail,
    confirmedEmail,
    setConfirmedEmail,
    name,
    setName,
    phone,
    setPhone,
    total,
    setTotal,
    terms,
    setTerms,
    error,
    setError,
    busy,
    saved,
    accepted,
    setAccepted,
    rows,
    setRows,
    snapshot,
    selectBuyer,
    save,
    approveSeller,
  };
}
