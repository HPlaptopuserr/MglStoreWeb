"use client";

import { useRegisteredCreditBorrower } from "../hooks/useRegisteredCreditBorrower";
import {
  registeredBorrowerPhone,
  verifiedCreditBorrower,
} from "../utils/registered-credit-borrower";
import { CreditCustomerWorkFields } from "./CreditCustomerWorkFields";
import { buildCreditBorrowerId } from "@mgl/types";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarClock,
  type LucideIcon,
  MapPin,
  Percent,
  Phone,
  Search,
  UserRound,
  X,
} from "lucide-react";
import type {
  PosCreditBorrower,
  SaleCreditPaymentMeta,
} from "../types/pos.types";

type CreditTargetType = "COMPANY" | "CUSTOMER";

type Props = {
  amount: number;
  organizationId: string;
  borrowers?: PosCreditBorrower[];
  onClose: () => void;
  onConfirm: (meta: SaleCreditPaymentMeta) => void;
};

const MONTHLY_INTEREST_RATE = 0.012;

const cleanText = (value: string) => value.trim();

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function calculateCreditTotals(principal: number, termMonths: number) {
  const safePrincipal = Math.max(0, Number(principal) || 0);
  const safeMonths = Math.max(1, Math.floor(Number(termMonths) || 1));
  return {
    monthlyInterestRate: MONTHLY_INTEREST_RATE,
    principal: safePrincipal,
    termMonths: safeMonths,
    totalDue: safePrincipal,
    totalInterest: 0,
  };
}

export function CreditPaymentDialog({
  amount,
  organizationId,
  borrowers = [],
  onClose,
  onConfirm,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, []);
  const [targetType, setTargetType] = useState<CreditTargetType>("CUSTOMER");
  const [borrowerSearch, setBorrowerSearch] = useState("");
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(
    null,
  );
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const registeredLookup = useRegisteredCreditBorrower(organizationId);
  const registeredUser = verifiedCreditBorrower(
    registeredLookup.state,
    organizationId,
    phone,
  );
  const [address, setAddress] = useState("");
  const [workDetails, setWorkDetails] = useState({
    workplace: "",
    department: "",
    jobTitle: "",
  });
  const [termMonths, setTermMonths] = useState(1);
  const [note, setNote] = useState("");

  const totals = useMemo(
    () => calculateCreditTotals(amount, termMonths),
    [amount, termMonths],
  );
  const selectedBorrower = useMemo(
    () =>
      borrowers.find((borrower) => borrower.id === selectedBorrowerId) ?? null,
    [borrowers, selectedBorrowerId],
  );
  const filteredBorrowers = useMemo(() => {
    const query = borrowerSearch.trim().toLocaleLowerCase("mn-MN");
    const terms = query.split(/\s+/).filter(Boolean);
    const phoneQuery = /^[+\d\s()-]+$/.test(query)
      ? query.replace(/\D/g, "")
      : "";
    return borrowers.filter((borrower) => {
      if (borrower.targetType !== targetType) return false;
      const text = [
        borrower.borrowerName,
        borrower.borrowerPhone,
        borrower.borrowerEmail,
        borrower.employeeName,
        borrower.workplace,
        borrower.department,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("mn-MN");
      return phoneQuery
        ? (borrower.borrowerPhone || "").replace(/\D/g, "").includes(phoneQuery)
        : terms.every((term) => text.includes(term));
    });
  }, [borrowers, targetType, borrowerSearch]);
  const dueDate = addMonths(new Date(), totals.termMonths);
  const borrowerName =
    targetType === "COMPANY"
      ? cleanText(companyName)
      : registeredUser?.fullName || "";
  const contactName =
    targetType === "COMPANY" ? registeredUser?.fullName || "" : "";
  const safePhone = registeredUser?.phoneNumber || "";
  const canConfirm = Boolean(
    registeredUser && (targetType !== "COMPANY" || borrowerName),
  );

  const clearSelectedBorrower = () => setSelectedBorrowerId(null);

  const changeTargetType = (next: CreditTargetType) => {
    registeredLookup.invalidate();
    setTargetType(next);
    setSelectedBorrowerId(null);
    setBorrowerSearch("");
  };

  const applyBorrower = (borrower: PosCreditBorrower) => {
    registeredLookup.invalidate();
    setTargetType(borrower.targetType);
    setSelectedBorrowerId(borrower.id);
    setCompanyName(
      borrower.targetType === "COMPANY" ? borrower.borrowerName : "",
    );
    setPhone(borrower.borrowerPhone || "");
    setAddress(borrower.borrowerAddress || "");
    setWorkDetails({
      workplace: borrower.workplace || "",
      department: borrower.department || "",
      jobTitle: borrower.jobTitle || "",
    });
  };

  const confirm = () => {
    if (!canConfirm || !registeredUser) return;
    const borrowerId =
      selectedBorrower?.targetType === targetType
        ? selectedBorrower.borrowerId
        : buildCreditBorrowerId(
            targetType,
            borrowerName,
            safePhone,
            contactName,
          );
    onConfirm({
      borrowerUserId: registeredUser.id,
      targetType,
      borrowerId,
      borrowerName,
      borrowerPhone: safePhone,
      borrowerEmail: registeredUser.email || undefined,
      borrowerAddress: cleanText(address) || undefined,
      workplace: workDetails.workplace.trim(),
      department: workDetails.department.trim(),
      jobTitle: workDetails.jobTitle.trim(),
      employeeId: targetType === "COMPANY" ? registeredUser.id : undefined,
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
    <dialog
      ref={dialog}
      aria-modal="true"
      aria-labelledby="credit-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="fixed inset-0 z-[75] m-0 hidden h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-2 open:flex backdrop:bg-black/75 backdrop:backdrop-blur-sm sm:p-4"
    >
      <button
        type="button"
        aria-label="Зээлийн popup хаах"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <section className="relative max-h-[calc(100dvh-1rem)] w-full max-w-7xl overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 p-4 text-white shadow-2xl shadow-black/60 sm:max-h-[calc(100dvh-2rem)] sm:p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-zinc-700 bg-zinc-900 p-2 text-zinc-400 hover:text-white"
          aria-label="Зээлийн popup хаах"
        >
          <X size={18} />
        </button>

        <div className="pr-12">
          <p className="text-[11px] font-black uppercase tracking-widest text-amber-400">
            Зээлээр төлөх
          </p>
          <h2 id="credit-dialog-title" className="mt-1 text-2xl font-black">
            Зээлдэгчийн мэдээлэл
          </h2>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-900 p-1">
              {[
                { key: "CUSTOMER", label: "Хувь хэрэглэгч", icon: UserRound },
                {
                  key: "COMPANY",
                  label: "Байгууллага",
                  icon: BriefcaseBusiness,
                },
              ].map((item) => {
                const Icon = item.icon;
                const active = targetType === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      changeTargetType(item.key as CreditTargetType)
                    }
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black transition ${
                      active
                        ? "bg-amber-500 text-black"
                        : "text-zinc-400 hover:text-white"
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
                    Хадгалсан зээлдэгчээ сонгоод MGL бүртгэлийг утсаар дахин
                    шалгана.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-zinc-950 px-3 py-1.5 text-xs font-black text-amber-300">
                  <span role="status" aria-live="polite">
                    {filteredBorrowers.length} олдсон
                  </span>
                </span>
              </div>
              <label className="relative mt-4 block">
                <span className="sr-only">Зээлдэгч хайх</span>
                <Search
                  size={18}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="search"
                  autoFocus
                  value={borrowerSearch}
                  onChange={(event) => setBorrowerSearch(event.target.value)}
                  placeholder="Нэр, утас, байгууллагаар хүн хайх"
                  className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
                />
              </label>
              {filteredBorrowers.length > 0 ? (
                <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                  {filteredBorrowers.map((borrower) => {
                    const active = borrower.id === selectedBorrowerId;
                    return (
                      <button
                        key={borrower.id}
                        type="button"
                        aria-pressed={active}
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
                          {[
                            borrower.borrowerPhone,
                            borrower.borrowerEmail,
                            borrower.employeeName,
                          ]
                            .filter(Boolean)
                            .join(" • ") || "Мэдээлэлгүй"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-zinc-800 px-4 py-3 text-xs font-semibold text-zinc-500">
                  {borrowerSearch.trim()
                    ? "Хадгалсан зээлдэгч олдсонгүй. Доор MGL-д бүртгэлтэй утасны дугаараар шалгана уу."
                    : "Энэ төрлийн хадгалсан зээлдэгч одоогоор алга байна."}
                </p>
              )}
            </div>

            <div
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
              aria-busy={registeredLookup.state.status === "loading"}
            >
              <p className="text-sm font-bold text-amber-200">
                MGL-д бүртгэлтэй хэрэглэгч шаардлагатай
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {targetType === "COMPANY"
                  ? "Зээл авах ажилтны MGL бүртгэлийг утсаар шалгана."
                  : "Зээл авах хүний MGL бүртгэлийг утсаар шалгана."}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <TextField
                  label={
                    targetType === "COMPANY"
                      ? "Ажилтны бүртгэлтэй утас"
                      : "MGL-д бүртгэлтэй утас"
                  }
                  value={phone}
                  icon={Phone}
                  inputMode="tel"
                  type="tel"
                  onChange={(value) => {
                    registeredLookup.invalidate();
                    clearSelectedBorrower();
                    setPhone(value);
                  }}
                />
                <button
                  type="button"
                  onClick={() => void registeredLookup.lookup(phone)}
                  disabled={
                    registeredLookup.state.status === "loading" ||
                    !registeredBorrowerPhone(phone)
                  }
                  className="h-12 rounded-xl border border-amber-500/50 bg-amber-500/15 px-4 text-sm font-bold text-amber-200 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {registeredLookup.state.status === "loading"
                    ? "Хайж байна…"
                    : "Утсаар хайх"}
                </button>
              </div>
              {registeredLookup.state.status === "loading" && (
                <p role="status" className="mt-3 text-sm text-zinc-300">
                  MGL хэрэглэгчийн мэдээллийг татаж байна…
                </p>
              )}
              {registeredLookup.state.status === "error" && (
                <p role="alert" className="mt-3 text-sm text-red-300">
                  {registeredLookup.state.message}
                </p>
              )}
              {registeredLookup.state.status === "empty" && (
                <p role="status" className="mt-3 text-sm text-amber-200">
                  Энэ дугаартай идэвхтэй MGL хэрэглэгч олдсонгүй. Эхлээд MGL-д
                  бүртгүүлж, мэдээллээ гүйцээсний дараа дахин шалгана уу.
                </p>
              )}
              {registeredLookup.state.status === "found" && (
                <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                  <p role="status" className="text-xs font-bold text-amber-200">
                    MGL хэрэглэгч олдлоо. Зээл авах хүнийг сонгоно уу.
                  </p>
                  <p className="mt-2 font-bold text-white">
                    {registeredLookup.state.user.fullName}
                  </p>
                  <p className="mt-1 text-sm text-zinc-300">
                    {registeredLookup.state.user.phoneNumber}
                    {registeredLookup.state.user.email
                      ? ` • ${registeredLookup.state.user.email}`
                      : ""}
                  </p>
                  <button
                    type="button"
                    onClick={registeredLookup.select}
                    className="mt-3 min-h-11 rounded-xl bg-amber-500 px-5 py-2 text-sm font-black text-black transition hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                  >
                    Сонгох
                  </button>
                </div>
              )}
              {registeredUser && (
                <div
                  role="status"
                  className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3"
                >
                  <p className="text-xs font-bold text-emerald-300">
                    Сонгосон MGL хэрэглэгч
                  </p>
                  <p className="mt-1 font-bold text-white">
                    {registeredUser.fullName}
                  </p>
                  <p className="mt-1 text-sm text-zinc-300">
                    {registeredUser.phoneNumber}
                    {registeredUser.email ? ` • ${registeredUser.email}` : ""}
                  </p>
                </div>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {targetType === "COMPANY" && (
                <TextField
                  label="Байгууллагын нэр"
                  value={companyName}
                  onChange={(value) => {
                    clearSelectedBorrower();
                    setCompanyName(value);
                  }}
                />
              )}
              <TextField
                label="Хаяг (нэмэлт)"
                value={address}
                onChange={(value) => {
                  clearSelectedBorrower();
                  setAddress(value);
                }}
                icon={MapPin}
                className={targetType === "COMPANY" ? "" : "md:col-span-2"}
              />
            </div>

            <CreditCustomerWorkFields
              value={workDetails}
              onChange={setWorkDetails}
            />

            <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                  Хугацаа
                </span>
                <select
                  value={termMonths}
                  onChange={(event) =>
                    setTermMonths(Number(event.target.value))
                  }
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
              <SummaryLine
                label="Зээлийн дүн"
                value={`₮${totals.principal.toLocaleString()}`}
              />
              <SummaryLine label="Хугацаа" value={`${totals.termMonths} сар`} />
              <SummaryLine
                label="Нийт хүү"
                value={`₮${totals.totalInterest.toLocaleString()}`}
              />
              <SummaryLine
                label="Нийт төлөх"
                value={`₮${totals.totalDue.toLocaleString()}`}
                strong
              />
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
    </dialog>
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
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
        {label}
      </span>
      <span className="relative mt-2 block">
        {Icon && (
          <Icon
            className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
            size={17}
          />
        )}
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

function SummaryLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-500">{label}</span>
      <span
        className={strong ? "text-xl font-black text-amber-300" : "text-white"}
      >
        {value}
      </span>
    </div>
  );
}
