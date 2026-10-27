"use client";
import Link from "next/link";
import { validatePurchaseTerms, type BuildingInventoryUnit } from "@mgl/types";
import { usePurchaseWizard } from "./usePurchaseWizard";
import { PaymentScheduleEditor } from "./PaymentScheduleEditor";
import { PurchaseContractDocument } from "./PurchaseContractDocument";
import "./purchases.css";
export function PurchaseWizard({ unit }: { unit: BuildingInventoryUnit }) {
  const {
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
  } = usePurchaseWizard(unit);
  if (saved)
    return (
      <div className="purchase-flow">
        <PurchaseContractDocument snapshot={saved.snapshot} id={saved.id} />
        <p>
          Худалдагч: {saved.sellerAcceptedAt ? "Зөвшөөрсөн" : "Хүлээгдэж байна"}{" "}
          · Худалдан авагч:{" "}
          {saved.buyerAcceptedAt ? "Зөвшөөрсөн" : "Хүлээгдэж байна"}
        </p>
        {!saved.sellerAcceptedAt && (
          <>
            <label className="purchase-consent">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />{" "}
              Худалдагчийн хувьд гэрээний нөхцөлийг зөвшөөрч байна.
            </label>
            <button disabled={!accepted || busy} onClick={approveSeller}>
              Худалдагчаар батлах
            </button>
          </>
        )}
        <p>
          Худалдан авагч{" "}
          <Link href="/building/buyer-login">өөрийн эрхээр нэвтэрч</Link> «Миний
          захиалга» хэсэгт гэрээг зөвшөөрнө.
        </p>
        <Link href="/building/manage/purchases">Гэрээний явц харах →</Link>
        {error && <p role="alert">{error}</p>}
      </div>
    );
  return (
    <div className="purchase-flow">
      <ol className="purchase-steps">
        {["Захиалагч", "Төлбөр, хуваарь", "Гэрээ шалгах"].map((label, i) => (
          <li key={label} aria-current={step === i ? "step" : undefined}>
            {i + 1}. {label}
          </li>
        ))}
      </ol>
      <p>
        <b>
          {unit.floor.block.name} · {unit.floor.number}-р давхар · №{" "}
          {unit.unitNo}
        </b>
      </p>
      {step === 0 && (
        <div className="purchase-fields">
          <label>
            Худалдан авагчийн бүртгэлтэй и-мэйл
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setConfirmedEmail("");
              }}
            />
          </label>
          <button disabled={busy || !email} onClick={selectBuyer}>
            Хэрэглэгч хайж сонгох
          </button>
          {confirmedEmail && (
            <p role="status">✓ Сонгосон хэрэглэгч: {confirmedEmail}</p>
          )}
          <label>
            Худалдан авагчийн нэр
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Утас
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
        </div>
      )}
      {step === 1 && (
        <>
          <label>
            Тохиролцсон нийт үнэ ₮
            <input
              inputMode="decimal"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </label>
          <PaymentScheduleEditor total={total} rows={rows} onChange={setRows} />
          <label>
            Гэрээний нөхцөл
            <textarea
              rows={5}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Хүлээлгэн өгөх хугацаа, талуудын үүрэг, төлбөрийн нөхцөл…"
            />
          </label>
        </>
      )}
      {step === 2 && <PurchaseContractDocument snapshot={snapshot} />}
      {error && (
        <p role="alert" className="building-alert">
          {error}
        </p>
      )}
      <div className="purchase-actions">
        {step > 0 && (
          <button disabled={busy} onClick={() => setStep(step - 1)}>
            ← Буцах
          </button>
        )}
        {step < 2 ? (
          <button
            disabled={busy}
            onClick={() => {
              setError("");
              if (!confirmedEmail || !name.trim()) {
                setError("Захиалагчийг сонгож нэрийг оруулна уу.");
                return;
              }
              try {
                if (step === 1) validatePurchaseTerms(snapshot);
                setStep(step + 1);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Мэдээллээ шалгана уу",
                );
              }
            }}
          >
            Үргэлжлүүлэх →
          </button>
        ) : (
          <button disabled={busy} onClick={save}>
            {busy ? "Хадгалж байна…" : "Гэрээ үүсгэж байрыг түр захиалах"}
          </button>
        )}
      </div>
    </div>
  );
}
