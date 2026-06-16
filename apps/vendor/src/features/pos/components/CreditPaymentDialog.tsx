"use client";

import { useMemo, useState } from "react";
import { BriefcaseBusiness, CalendarClock, Percent, Search, UserRound, X } from "lucide-react";
import type { SaleCreditPaymentMeta } from "../types/pos.types";

type CreditTargetType = "COMPANY" | "CUSTOMER";

type CreditCompany = {
  id: string;
  name: string;
  employees: Array<{ id: string; name: string; phone: string; role: string }>;
};

type CreditCustomer = {
  id: string;
  name: string;
  phone: string;
};

type Props = {
  amount: number;
  onClose: () => void;
  onConfirm: (meta: SaleCreditPaymentMeta) => void;
};

const MONTHLY_INTEREST_RATE = 0.012;

const CREDIT_COMPANIES: CreditCompany[] = [
  {
    id: "mgl-steppe",
    name: "MGL Steppe",
    employees: [
      { id: "steppe-erdene", name: "Эрдэнэ", phone: "90696900", role: "Operations" },
      { id: "steppe-bolor", name: "Болор", phone: "88112233", role: "Procurement" },
    ],
  },
  {
    id: "mgl-digital",
    name: "MGL Digital",
    employees: [
      { id: "digital-anand", name: "Ананд", phone: "99001122", role: "Engineer" },
      { id: "digital-saruul", name: "Саруул", phone: "88009900", role: "Finance" },
    ],
  },
];

const CREDIT_CUSTOMERS: CreditCustomer[] = [
  { id: "customer-90696900", name: "ыбый", phone: "90696900" },
  { id: "customer-99112233", name: "Хувь хэрэглэгч", phone: "99112233" },
];

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
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

export function CreditPaymentDialog({ amount, onClose, onConfirm }: Props) {
  const [targetType, setTargetType] = useState<CreditTargetType>("COMPANY");
  const [companyId, setCompanyId] = useState(CREDIT_COMPANIES[0]?.id || "");
  const [employeeId, setEmployeeId] = useState(CREDIT_COMPANIES[0]?.employees[0]?.id || "");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [termMonths, setTermMonths] = useState(1);
  const [note, setNote] = useState("");

  const selectedCompany = CREDIT_COMPANIES.find((company) => company.id === companyId) || CREDIT_COMPANIES[0];
  const selectedEmployee =
    selectedCompany?.employees.find((employee) => employee.id === employeeId) ||
    selectedCompany?.employees[0];
  const filteredCustomers = CREDIT_CUSTOMERS.filter((customer) => {
    const haystack = `${customer.name} ${customer.phone}`.toLowerCase();
    return haystack.includes(customerQuery.trim().toLowerCase());
  });
  const selectedCustomer = CREDIT_CUSTOMERS.find((customer) => customer.id === customerId);
  const totals = useMemo(() => calculateCreditTotals(amount, termMonths), [amount, termMonths]);
  const dueDate = addMonths(new Date(), totals.termMonths);
  const canConfirm = targetType === "COMPANY" ? Boolean(selectedCompany && selectedEmployee) : Boolean(selectedCustomer);

  const confirm = () => {
    if (!canConfirm) return;
    const borrowerName = targetType === "COMPANY" ? selectedCompany.name : selectedCustomer!.name;
    const borrowerId = targetType === "COMPANY" ? selectedCompany.id : selectedCustomer!.id;
    const borrowerPhone = targetType === "COMPANY" ? selectedEmployee?.phone : selectedCustomer!.phone;
    onConfirm({
      targetType,
      borrowerId,
      borrowerName,
      borrowerPhone,
      employeeId: targetType === "COMPANY" ? selectedEmployee?.id : undefined,
      employeeName: targetType === "COMPANY" ? selectedEmployee?.name : undefined,
      dueDate: dueDate.toISOString(),
      monthlyInterestRate: totals.monthlyInterestRate,
      note: note.trim() || undefined,
      principal: totals.principal,
      termMonths: totals.termMonths,
      totalDue: totals.totalDue,
      totalInterest: totals.totalInterest,
    });
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Зээлийн popup хаах" onClick={onClose} className="absolute inset-0 cursor-default" />
      <section className="relative max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 p-5 text-white shadow-2xl shadow-black/60">
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
          <h2 className="mt-1 text-2xl font-black">Зээлийн мэдээлэл сонгох</h2>
          <p className="mt-1 text-sm font-semibold text-zinc-500">
            Сарын 1.2% хүүтэй. Байгууллагаар бол company болон ажилтан, хувь хэрэглэгчээр бол хэрэглэгч сонгоно.
          </p>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-900 p-1">
              {[
                { key: "COMPANY", label: "Байгууллага", icon: BriefcaseBusiness },
                { key: "CUSTOMER", label: "Хувь хэрэглэгч", icon: UserRound },
              ].map((item) => {
                const Icon = item.icon;
                const active = targetType === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTargetType(item.key as CreditTargetType)}
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

            {targetType === "COMPANY" ? (
              <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Company</p>
                  {CREDIT_COMPANIES.map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => {
                        setCompanyId(company.id);
                        setEmployeeId(company.employees[0]?.id || "");
                      }}
                      className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${
                        companyId === company.id
                          ? "border-amber-500 bg-amber-500/10 text-amber-200"
                          : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                      }`}
                    >
                      {company.name}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Ажилтан</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {selectedCompany?.employees.map((employee) => (
                      <button
                        key={employee.id}
                        type="button"
                        onClick={() => setEmployeeId(employee.id)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          employeeId === employee.id
                            ? "border-amber-500 bg-amber-500/10"
                            : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                        }`}
                      >
                        <p className="text-sm font-black text-white">{employee.name}</p>
                        <p className="mt-1 text-xs font-semibold text-zinc-500">{employee.role} • {employee.phone}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={17} />
                  <input
                    value={customerQuery}
                    onChange={(event) => setCustomerQuery(event.target.value)}
                    placeholder="Утас эсвэл нэрээр хайх"
                    className="h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900 pl-11 pr-4 text-sm font-bold text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => setCustomerId(customer.id)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        customerId === customer.id
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                      }`}
                    >
                      <p className="text-sm font-black text-white">{customer.name}</p>
                      <p className="mt-1 text-xs font-semibold text-zinc-500">{customer.phone}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Хугацаа</span>
                <select
                  value={termMonths}
                  onChange={(event) => setTermMonths(Number(event.target.value))}
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-black text-white outline-none focus:border-amber-500"
                >
                  {[1, 2, 3, 6, 12].map((month) => (
                    <option key={month} value={month}>{month} сар</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Тэмдэглэл</span>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Жишээ: гэрээний дугаар, зөвшөөрсөн хүн"
                  className="mt-2 h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-bold text-white outline-none focus:border-amber-500"
                />
              </label>
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

function SummaryLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-500">{label}</span>
      <span className={strong ? "text-xl font-black text-amber-300" : "text-white"}>{value}</span>
    </div>
  );
}
