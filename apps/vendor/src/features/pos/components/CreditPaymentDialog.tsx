"use client";

import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarClock,
  type LucideIcon,
  Mail,
  MapPin,
  Percent,
  Phone,
  UserRound,
  X,
} from "lucide-react";
import type { PosCreditBorrower, SaleCreditPaymentMeta } from "../types/pos.types";

type CreditTargetType = "COMPANY" | "CUSTOMER";

type Props = {
  amount: number;
  borrowers?: PosCreditBorrower[];
  onClose: () => void;
  onConfirm: (meta: SaleCreditPaymentMeta) => void;
};

const MONTHLY_INTEREST_RATE = 0.012;

const digitsOnly = (value: string) => value.replace(/\D/g, "");
const cleanText = (value: string) => value.trim();
const slugText = (value: string) =>
  cleanText(value)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9а-яөүё-]/gi, "")
    .slice(0, 60);

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function buildBorrowerId(targetType: CreditTargetType, name: string, phone: string, employeeName: string) {
  const phoneKey = digitsOnly(phone);
  if (targetType === "CUSTOMER") {
    return phoneKey ? `customer-${phoneKey}` : `customer-${slugText(name)}`;
  }
  const companyKey = slugText(name) || "company";
  const employeeKey = phoneKey || slugText(employeeName) || "contact";
  return `company-${companyKey}-${employeeKey}`;
}

export function calculateCreditTotals(principal: number, termMonths: number) {
  const safePrincipal = Math.max(0, Number(principal) || 0);
  const safeMonths = Math.max(1, Math.floor(Number(termMonths) || 1));
  const totalInterest = Math.round(safePrincipal * MONTHLY_INTEREST_RATE * safeMonths);
  return {
    monthlyInterestRate: MONTHLY_INTEREST_RATE,
    principal: safePrincipal,
    termMonths: safeMonths,
    totalDue: safePrincipal + totalInterest,
    totalInterest,
  };
}

export function CreditPaymentDialog({ amount, borrowers = [], onClose, onConfirm }: Props) {
  const [targetType, setTargetType] = useState<CreditTargetType>("CUSTOMER");
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [termMonths, setTermMonths] = useState(1);
  const [note, setNote] = useState("");

  const totals = useMemo(() => calculateCreditTotals(amount, termMonths), [amount, termMonths]);
  const selectedBorrower = useMemo(
    () => borrowers.find((borrower) => borrower.id === selectedBorrowerId) ?? null,
    [borrowers, selectedBorrowerId],
  );
  const filteredBorrowers = useMemo(() => {
    return borrowers.filter((borrower) => borrower.targetType === targetType);
  }, [borrowers, targetType]);
  const dueDate = addMonths(new Date(), totals.termMonths);
  const borrowerName = targetType === "COMPANY" ? cleanText(companyName) : cleanText(customerName);
  const contactName = targetType === "COMPANY" ? cleanText(employeeName) : "";
  const safePhone = cleanText(phone);
  const canConfirm =
    targetType === "COMPANY"
      ? Boolean(borrowerName && contactName && safePhone)
      : Boolean(borrowerName && safePhone);

  const clearSelectedBorrower = () => setSelectedBorrowerId(null);

  const changeTargetType = (next: CreditTargetType) => {
    setTargetType(next);
    setSelectedBorrowerId(null);
  };

  const applyBorrower = (borrower: PosCreditBorrower) => {
    setTargetType(borrower.targetType);
    setSelectedBorrowerId(borrower.id);
    setCustomerName(borrower.targetType === "CUSTOMER" ? borrower.borrowerName : "");
    setCompanyName(borrower.targetType === "COMPANY" ? borrower.borrowerName : "");
    setEmployeeName(borrower.employeeName || "");
    setPhone(borrower.borrowerPhone || "");
    setEmail(borrower.borrowerEmail || "");
    setAddress(borrower.borrowerAddress || "");
  };

  const confirm = () => {
    if (!canConfirm) return;
    const borrowerId =
      selectedBorrower?.targetType === targetType
        ? selectedBorrower.borrowerId
        : buildBorrowerId(targetType, borrowerName, safePhone, contactName);
    onConfirm({
      targetType,
      borrowerId,
      borrowerName,
      borrowerPhone: safePhone,
      borrowerEmail: cleanText(email) || undefined,
      borrowerAddress: cleanText(address) || undefined,
      employeeId:
        targetType === "COMPANY"
          ? selectedBorrower?.employeeId || `${borrowerId}-employee`
          : undefined,
      employeeName: targetType === "COMPANY" ? contactName : undefined,
      dueDate: dueDate.toISOString(),
      monthlyInterestRate: totals.monthlyInterestRate,
      note: cleanText(note) || undefined,
      principal: totals.principal,
      termMonths: totals.termMonths,
      totalDue: totals.totalDue,
      totalInterest: totals.totalInterest,
    });
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Зээлийн popup хаах" onClick={onClose} className="absolute inset-0 cursor-default" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="credit-dialog-title"
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 p-5 text-white shadow-2xl shadow-black/60"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-zinc-700 bg-zinc-900 p-2 text-zinc-400 hover:text-white"
          aria-label="Зээлийн popup хаах"
        >
          <X size={18} />
        </button>

        <div className="pr-12">
          <p className="text-[11px] font-black uppercase tracking-widest text-amber-400">Зээлээр төлөх</p>
          <h2 id="credit-dialog-title" className="mt-1 text-2xl font-black">Зээлдэгчийн мэдээлэл</h2>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-900 p-1">
              {[
                { key: "CUSTOMER", label: "Хувь хэрэглэгч", icon: UserRound },
                { key: "COMPANY", label: "Байгууллага", icon: BriefcaseBusiness },
              ].map((item) => {
                const Icon = item.icon;
                const active = targetType === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => changeTargetType(item.key as CreditTargetType)}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black transition ${
                      active ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Icon size={17} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Бүртгэлтэй зээлдэгчид
                  </p>
                  <p className="mt-1 text-xs font-semibold text-zinc-600">
                    Өмнө бүртгэсэн хүнийг сонгоход мэдээлэл нь бөглөгдөнө.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-zinc-950 px-3 py-1.5 text-xs font-black text-amber-300">
                  {filteredBorrowers.length}
                </span>
              </div>
              {filteredBorrowers.length > 0 ? (
                <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                  {filteredBorrowers.map((borrower) => {
                    const active = borrower.id === selectedBorrowerId;
                    return (
                      <button
                        key={borrower.id}
                        type="button"
                        onClick={() => applyBorrower(borrower)}
                        className={`min-w-0 rounded-xl border px-4 py-3 text-left transition ${
                          active
                            ? "border-amber-400 bg-amber-500/15"
                            : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-black text-white">
                            {borrower.borrowerName}
                          </p>
                          <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-1 text-[10px] font-black text-amber-300">
                            Сонгох
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs font-semibold text-zinc-500">
                          {[borrower.borrowerPhone, borrower.borrowerEmail, borrower.employeeName]
                            .filter(Boolean)
                            .join(" • ") || "Мэдээлэлгүй"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-zinc-800 px-4 py-3 text-xs font-semibold text-zinc-500">
                  Энэ төрлийн хадгалсан зээлдэгч одоогоор алга байна.
                </p>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {targetType === "COMPANY" ? (
                <>
                  <TextField
                    label="Байгууллагын нэр"
                    value={companyName}
                    onChange={(value) => {
                      clearSelectedBorrower();
                      setCompanyName(value);
                    }}
                    autoFocus
                  />
                  <TextField
                    label="Ажилтны нэр"
                    value={employeeName}
                    onChange={(value) => {
                      clearSelectedBorrower();
                      setEmployeeName(value);
                    }}
                  />
                </>
              ) : (
                <TextField
                  label="Зээлдэгчийн нэр"
                  value={customerName}
                  onChange={(value) => {
                    clearSelectedBorrower();
                    setCustomerName(value);
                  }}
                  autoFocus
                />
              )}

              <TextField
                label="Утас"
                value={phone}
                onChange={(value) => {
                  clearSelectedBorrower();
                  setPhone(value);
                }}
                icon={Phone}
                inputMode="tel"
              />
              <TextField
                label="Email"
                value={email}
                onChange={(value) => {
                  clearSelectedBorrower();
                  setEmail(value);
                }}
                icon={Mail}
                type="email"
              />
              <TextField
                label="Хаяг"
                value={address}
                onChange={(value) => {
                  clearSelectedBorrower();
                  setAddress(value);
                }}
                icon={MapPin}
                className="md:col-span-2"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Хугацаа</span>
                <select
                  value={termMonths}
                  onChange={(event) => setTermMonths(Number(event.target.value))}
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-black text-white outline-none focus:border-amber-500"
                >
                  {[1, 2, 3, 6, 12].map((month) => (
                    <option key={month} value={month}>
                      {month} сар
                    </option>
                  ))}
                </select>
              </label>
              <TextField label="Тэмдэглэл" value={note} onChange={setNote} />
            </div>
          </div>

          <aside className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5">
            <div className="flex items-center gap-2 text-amber-200">
              <Percent size={18} />
              <p className="text-sm font-black">Сарын хүү 1.2%</p>
            </div>
            <div className="mt-5 space-y-3 text-sm font-bold">
              <SummaryLine label="Зээлийн дүн" value={`₮${totals.principal.toLocaleString()}`} />
              <SummaryLine label="Хугацаа" value={`${totals.termMonths} сар`} />
              <SummaryLine label="Нийт хүү" value={`₮${totals.totalInterest.toLocaleString()}`} />
              <SummaryLine label="Нийт төлөх" value={`₮${totals.totalDue.toLocaleString()}`} strong />
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-zinc-300">
              <CalendarClock size={18} className="text-amber-300" />
              Дуусах: {dueDate.toLocaleDateString("mn-MN")}
            </div>
            <button
              type="button"
              onClick={confirm}
              disabled={!canConfirm}
              className="mt-5 w-full rounded-2xl bg-amber-500 px-5 py-4 text-sm font-black text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Зээлээр нэмэх
            </button>
          </aside>
        </div>
      </section>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  icon: Icon,
  className = "",
  autoFocus,
  inputMode,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon?: LucideIcon;
  className?: string;
  autoFocus?: boolean;
  inputMode?: "text" | "tel" | "email";
  type?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{label}</span>
      <span className="relative mt-2 block">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={17} />}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoFocus={autoFocus}
          inputMode={inputMode}
          type={type}
          className={`h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-bold text-white outline-none focus:border-amber-500 ${
            Icon ? "pl-11" : ""
          }`}
        />
      </span>
    </label>
  );
}

function SummaryLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-500">{label}</span>
      <span className={strong ? "text-xl font-black text-amber-300" : "text-white"}>{value}</span>
    </div>
  );
}
