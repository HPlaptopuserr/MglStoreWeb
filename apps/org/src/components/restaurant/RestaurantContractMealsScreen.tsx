"use client";

import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { QrGenerator } from "@mgl/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOrg } from "@/components/org/OrgContext";
import {
  createRestaurantMealContract,
  createRestaurantMealContractMember,
  getRestaurantMealContracts,
  getRestaurantMealReport,
  updateRestaurantMealContract,
  updateRestaurantMealContractMember,
  type RestaurantMealContract,
  type RestaurantMealContractMember,
  type RestaurantMealReport,
} from "@/lib/restaurant-pos-api";

const moneyFormatter = new Intl.NumberFormat("mn-MN", {
  maximumFractionDigits: 0,
});
const formatMoney = (value: number) => `${moneyFormatter.format(value)}₮`;

const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const monthStartKey = () => {
  const now = new Date();
  return localDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const csvCell = (value: unknown) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

export function RestaurantContractMealsScreen() {
  const { user } = useOrg();
  const organizationId = user.organizationId || "";
  const [contracts, setContracts] = useState<RestaurantMealContract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [contractSearch, setContractSearch] = useState("");
  const [showContractForm, setShowContractForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [selectedQrMember, setSelectedQrMember] =
    useState<RestaurantMealContractMember | null>(null);
  const qrRef = useRef<HTMLDivElement | null>(null);

  const [contractForm, setContractForm] = useState({
    customerOrganization: "",
    customerRegisterNo: "",
    startDate: localDateKey(),
    endDate: localDateKey(addMonths(new Date(), 1)),
    note: "",
  });
  const [memberForm, setMemberForm] = useState({
    employeeCode: "",
    fullName: "",
    department: "",
    pin: "",
    dailyLimit: "",
    monthlyLimit: "",
  });

  const [reportFrom, setReportFrom] = useState(monthStartKey());
  const [reportTo, setReportTo] = useState(localDateKey());
  const [reportContractId, setReportContractId] = useState("");
  const [report, setReport] = useState<RestaurantMealReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const loadContracts = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError("");
    try {
      const next = await getRestaurantMealContracts(organizationId);
      setContracts(next);
      setSelectedContractId((current) =>
        next.some((contract) => contract.id === current)
          ? current
          : next.find((contract) => contract.activeNow)?.id ||
            next[0]?.id ||
            "",
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Гэрээт байгууллагын мэдээлэл ачаалж чадсангүй.",
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadContracts();
  }, [loadContracts]);

  const loadReport = useCallback(async () => {
    if (!organizationId || !reportFrom || !reportTo) return;
    setReportLoading(true);
    setError("");
    try {
      const next = await getRestaurantMealReport({
        organizationId,
        from: reportFrom,
        to: reportTo,
        contractId: reportContractId || undefined,
      });
      setReport(next);
    } catch (reportError) {
      setError(
        reportError instanceof Error
          ? reportError.message
          : "Гэрээт хоолны тайлан ачаалж чадсангүй.",
      );
    } finally {
      setReportLoading(false);
    }
  }, [organizationId, reportContractId, reportFrom, reportTo]);

  useEffect(() => {
    if (organizationId) void loadReport();
  }, [loadReport, organizationId]);

  const selectedContract =
    contracts.find((contract) => contract.id === selectedContractId) || null;

  const visibleContracts = useMemo(() => {
    const query = contractSearch.trim().toLocaleLowerCase("mn");
    if (!query) return contracts;
    return contracts.filter((contract) =>
      [contract.customerOrganization, contract.customerRegisterNo]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("mn").includes(query)),
    );
  }, [contractSearch, contracts]);

  const handleCreateContract = async () => {
    if (!organizationId || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const created = await createRestaurantMealContract({
        organizationId,
        customerOrganization: contractForm.customerOrganization,
        customerRegisterNo: contractForm.customerRegisterNo || undefined,
        startDate: contractForm.startDate,
        endDate: contractForm.endDate,
        note: contractForm.note || undefined,
      });
      setContracts((current) => [created, ...current]);
      setSelectedContractId(created.id);
      setReportContractId(created.id);
      setContractForm({
        customerOrganization: "",
        customerRegisterNo: "",
        startDate: localDateKey(),
        endDate: localDateKey(addMonths(new Date(), 1)),
        note: "",
      });
      setShowContractForm(false);
      setNotice(`${created.customerOrganization} амжилттай бүртгэгдлээ.`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Гэрээт байгууллага үүсгэж чадсангүй.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleContract = async (contract: RestaurantMealContract) => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateRestaurantMealContract({
        id: contract.id,
        status: contract.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
      setContracts((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice(
        updated.status === "ACTIVE"
          ? "Гэрээг идэвхжүүллээ."
          : "Гэрээг идэвхгүй болголоо.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Гэрээний төлөв сольж чадсангүй.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMember = async () => {
    if (!selectedContract || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const created = await createRestaurantMealContractMember({
        contractId: selectedContract.id,
        employeeCode: memberForm.employeeCode,
        fullName: memberForm.fullName,
        department: memberForm.department || undefined,
        pin: memberForm.pin,
        dailyLimit: memberForm.dailyLimit
          ? Number(memberForm.dailyLimit)
          : null,
        monthlyLimit: memberForm.monthlyLimit
          ? Number(memberForm.monthlyLimit)
          : null,
      });
      setContracts((current) =>
        current.map((contract) =>
          contract.id === selectedContract.id
            ? { ...contract, members: [...contract.members, created] }
            : contract,
        ),
      );
      setMemberForm({
        employeeCode: "",
        fullName: "",
        department: "",
        pin: "",
        dailyLimit: "",
        monthlyLimit: "",
      });
      setShowMemberForm(false);
      setSelectedQrMember(created);
      setNotice(`${created.fullName} ажилтны эрх үүслээ.`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Гэрээт ажилтан нэмэж чадсангүй.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMember = async (member: RestaurantMealContractMember) => {
    if (!selectedContract || saving) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateRestaurantMealContractMember({
        id: member.id,
        isActive: !member.isActive,
      });
      setContracts((current) =>
        current.map((contract) =>
          contract.id === selectedContract.id
            ? {
                ...contract,
                members: contract.members.map((item) =>
                  item.id === updated.id ? updated : item,
                ),
              }
            : contract,
        ),
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Ажилтны төлөв сольж чадсангүй.",
      );
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    if (!report) return;
    const headers = [
      "Огноо",
      "Байгууллага",
      "Регистр",
      "Ажилтны код",
      "Ажилтан",
      "Салбар",
      "Захиалгын дугаар",
      "Хоол",
      "Тоо",
      "Нэгж үнэ",
      "Мөрийн дүн",
      "Захиалгын нийт",
    ];
    const rows = report.charges.flatMap((charge) =>
      charge.items.map((item) => [
        formatDateTime(charge.orderedAt),
        charge.companyName,
        charge.registerNo || "",
        charge.employeeCode,
        charge.employeeName,
        charge.branchName,
        charge.ticketNo,
        item.productName,
        item.qty,
        item.unitPrice,
        item.lineTotal,
        charge.amount,
      ]),
    );
    const csv = `\uFEFF${[headers, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n")}`;
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gereet-hool-${report.from}-${report.to}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    if (!report) return;
    const popup = window.open("", "_blank", "width=1100,height=760");
    if (!popup) {
      setError("Хэвлэх цонх нээхийг browser хориглолоо.");
      return;
    }
    const rows = report.charges
      .map(
        (charge) => `<tr>
          <td>${escapeHtml(formatDateTime(charge.orderedAt))}</td>
          <td>${escapeHtml(charge.companyName)}</td>
          <td>${escapeHtml(charge.employeeCode)} · ${escapeHtml(charge.employeeName)}</td>
          <td>${escapeHtml(charge.ticketNo)}</td>
          <td>${escapeHtml(charge.items.map((item) => `${item.productName} × ${item.qty}`).join(", "))}</td>
          <td class="money">${escapeHtml(formatMoney(charge.amount))}</td>
        </tr>`,
      )
      .join("");
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8" />
      <title>Гэрээт хоолны тайлан</title><style>
      @page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#111;font-size:11px}
      h1{font-size:20px;margin:0 0 6px}.meta{color:#555;margin-bottom:16px}.summary{display:flex;gap:24px;margin:12px 0 18px;font-size:14px}
      table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:6px;vertical-align:top}th{background:#eee;text-align:left}.money{text-align:right;white-space:nowrap}
      </style></head><body><h1>Гэрээт байгууллагын хоолны тайлан</h1>
      <div class="meta">${escapeHtml(report.from)} – ${escapeHtml(report.to)}</div>
      <div class="summary"><strong>Захиалга: ${report.orderCount}</strong><strong>Нийт: ${escapeHtml(formatMoney(report.total))}</strong></div>
      <table><thead><tr><th>Огноо</th><th>Байгууллага</th><th>Ажилтан</th><th>Захиалга</th><th>Хоол</th><th>Дүн</th></tr></thead><tbody>${rows}</tbody></table>
      <script>window.onload=()=>window.print();<\/script></body></html>`);
    popup.document.close();
  };

  const printMemberCard = () => {
    if (!selectedQrMember) return;
    const svg = qrRef.current?.querySelector("svg")?.outerHTML || "";
    const company = selectedContract?.customerOrganization || "";
    const popup = window.open("", "_blank", "width=500,height=700");
    if (!popup) {
      setError("QR карт хэвлэх цонх нээхийг browser хориглолоо.");
      return;
    }
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8" />
      <title>${escapeHtml(selectedQrMember.fullName)}</title><style>
      @page{size:90mm 55mm;margin:4mm}body{margin:0;font-family:Arial,sans-serif;color:#10221c}.card{width:82mm;height:47mm;border:1px solid #bbb;border-radius:4mm;padding:4mm;display:grid;grid-template-columns:34mm 1fr;gap:4mm;align-items:center;box-sizing:border-box}.qr svg{width:32mm;height:32mm}.company{font-size:9px;font-weight:700;color:#13795b}.name{font-size:15px;font-weight:900;margin-top:2mm}.code{font-size:10px;margin-top:1mm;color:#555}.hint{font-size:8px;margin-top:3mm;color:#777}</style></head>
      <body><div class="card"><div class="qr">${svg}</div><div><div class="company">${escapeHtml(company)}</div><div class="name">${escapeHtml(selectedQrMember.fullName)}</div><div class="code">Код: ${escapeHtml(selectedQrMember.employeeCode)}</div><div class="hint">Киоск дээр QR кодоо уншуулаад хувийн PIN-ээ оруулна.</div></div></div><script>window.onload=()=>window.print();<\/script></body></html>`);
    popup.document.close();
  };

  return (
    <main className="min-h-screen bg-[#f3f5f2] px-4 py-6 text-[#10221c] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              Ресторан · Сарын тооцоо
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Гэрээт байгууллагын хоол
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              Байгууллага, ажилтны QR/PIN эрх болон төлбөргүй хоолны хэрэглээг
              нэг дор бүртгэнэ. Энэ хэсэгт төлбөр, хүү, Ebarimt үүсэхгүй.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadContracts()}
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 shadow-sm disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Шинэчлэх
            </button>
            <button
              type="button"
              onClick={() => setShowContractForm(true)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#11231d] px-4 text-xs font-black text-white shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Байгууллага нэмэх
            </button>
          </div>
        </header>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            {notice}
          </div>
        ) : null}

        <section className="mt-6 grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={contractSearch}
                onChange={(event) => setContractSearch(event.target.value)}
                placeholder="Байгууллага хайх..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
            <div className="mt-4 max-h-[650px] space-y-2 overflow-y-auto pr-1">
              {loading ? (
                <div className="flex h-32 items-center justify-center gap-2 text-sm font-bold text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" /> Ачаалж байна
                </div>
              ) : visibleContracts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center">
                  <Building2 className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-500">
                    Гэрээт байгууллага алга
                  </p>
                </div>
              ) : (
                visibleContracts.map((contract) => (
                  <button
                    key={contract.id}
                    type="button"
                    onClick={() => setSelectedContractId(contract.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedContractId === contract.id
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-100 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black">
                          {contract.customerOrganization}
                        </span>
                        <span className="mt-1 block text-xs font-semibold text-slate-500">
                          {contract.members.length} ажилтан ·{" "}
                          {contract.chargeCount} захиалга
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${
                          contract.activeNow
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {contract.activeNow ? "Идэвхтэй" : "Идэвхгүй"}
                      </span>
                    </span>
                    <span className="mt-3 flex items-center gap-2 text-[11px] font-bold text-slate-400">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {contract.startDate} – {contract.endDate}
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            {selectedContract ? (
              <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#11231d] text-white">
                      <Building2 className="h-6 w-6" />
                    </span>
                    <div>
                      <h2 className="text-xl font-black">
                        {selectedContract.customerOrganization}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {selectedContract.customerRegisterNo
                          ? `Регистр: ${selectedContract.customerRegisterNo} · `
                          : ""}
                        {selectedContract.startDate} –{" "}
                        {selectedContract.endDate}
                      </p>
                      {selectedContract.note ? (
                        <p className="mt-2 text-xs font-semibold text-slate-400">
                          {selectedContract.note}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReportContractId(selectedContract.id);
                      }}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-700"
                    >
                      <FileText className="h-4 w-4" /> Тайлан
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleToggleContract(selectedContract)
                      }
                      disabled={saving}
                      className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-black ${
                        selectedContract.status === "ACTIVE"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {selectedContract.status === "ACTIVE"
                        ? "Идэвхгүй болгох"
                        : "Идэвхжүүлэх"}
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                  <div>
                    <h3 className="text-base font-black">Гэрээт ажилтнууд</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      QR карт болон PIN-ээр киоск дээр танина.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMemberForm(true)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-3 text-xs font-black text-white"
                  >
                    <UserPlus className="h-4 w-4" /> Ажилтан нэмэх
                  </button>
                </div>

                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Ажилтан</th>
                        <th className="px-4 py-3">Код / хэлтэс</th>
                        <th className="px-4 py-3">Лимит</th>
                        <th className="px-4 py-3">Сүүлд ашигласан</th>
                        <th className="px-4 py-3 text-right">Үйлдэл</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedContract.members.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-10 text-center text-sm font-bold text-slate-400"
                          >
                            Ажилтан бүртгээгүй байна.
                          </td>
                        </tr>
                      ) : (
                        selectedContract.members.map((member) => (
                          <tr
                            key={member.id}
                            className={!member.isActive ? "opacity-50" : ""}
                          >
                            <td className="px-4 py-3">
                              <p className="font-black text-slate-800">
                                {member.fullName}
                              </p>
                              <p className="mt-1 text-[11px] font-bold text-slate-400">
                                {member.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                              </p>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-600">
                              {member.employeeCode}
                              {member.department
                                ? ` · ${member.department}`
                                : ""}
                            </td>
                            <td className="px-4 py-3 text-xs font-bold text-slate-600">
                              <p>
                                Өдөр:{" "}
                                {member.dailyLimit
                                  ? formatMoney(member.dailyLimit)
                                  : "—"}
                              </p>
                              <p className="mt-1">
                                Сар:{" "}
                                {member.monthlyLimit
                                  ? formatMoney(member.monthlyLimit)
                                  : "—"}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                              {member.lastUsedAt
                                ? formatDateTime(member.lastUsedAt)
                                : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedQrMember(member)}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-[11px] font-black text-slate-700"
                                >
                                  <QrCode className="h-3.5 w-3.5" /> QR
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleToggleMember(member)
                                  }
                                  disabled={saving}
                                  className={`h-9 rounded-lg px-3 text-[11px] font-black ${member.isActive ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}
                                >
                                  {member.isActive ? "Идэвхгүй" : "Идэвхжүүлэх"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : (
              <section className="grid min-h-72 place-items-center rounded-[24px] border border-dashed border-slate-300 bg-white text-center">
                <div>
                  <Users className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-500">
                    Байгууллага сонгоно уу
                  </p>
                </div>
              </section>
            )}

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">Хоолны тооцооны тайлан</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Сонгосон хугацааны байгууллага, ажилтан, хоолны нийлбэр.
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-[11px] font-black text-slate-500">
                    Эхлэх
                    <input
                      type="date"
                      value={reportFrom}
                      onChange={(event) => setReportFrom(event.target.value)}
                      className="mt-1 block h-10 rounded-lg border border-slate-200 px-2 text-xs font-bold"
                    />
                  </label>
                  <label className="text-[11px] font-black text-slate-500">
                    Дуусах
                    <input
                      type="date"
                      value={reportTo}
                      onChange={(event) => setReportTo(event.target.value)}
                      className="mt-1 block h-10 rounded-lg border border-slate-200 px-2 text-xs font-bold"
                    />
                  </label>
                  <label className="text-[11px] font-black text-slate-500">
                    Байгууллага
                    <select
                      value={reportContractId}
                      onChange={(event) =>
                        setReportContractId(event.target.value)
                      }
                      className="mt-1 block h-10 max-w-52 rounded-lg border border-slate-200 px-2 text-xs font-bold"
                    >
                      <option value="">Бүгд</option>
                      {contracts.map((contract) => (
                        <option key={contract.id} value={contract.id}>
                          {contract.customerOrganization}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => void loadReport()}
                    disabled={reportLoading}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#11231d] px-4 text-xs font-black text-white disabled:opacity-50"
                  >
                    {reportLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    Тайлан гаргах
                  </button>
                </div>
              </div>

              {report ? (
                <>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Байгууллага
                      </p>
                      <p className="mt-2 text-2xl font-black">
                        {report.companies.length}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Захиалга
                      </p>
                      <p className="mt-2 text-2xl font-black">
                        {report.orderCount}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                        Нийт тооцоо
                      </p>
                      <p className="mt-2 text-2xl font-black text-emerald-900">
                        {formatMoney(report.total)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={exportCsv}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-700"
                    >
                      <Download className="h-4 w-4" /> Excel (CSV)
                    </button>
                    <button
                      type="button"
                      onClick={printReport}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-700"
                    >
                      <Printer className="h-4 w-4" /> PDF / хэвлэх
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="rounded-2xl border border-slate-100 p-3">
                      <p className="px-2 pb-2 text-xs font-black uppercase tracking-wider text-slate-400">
                        Байгууллагын нийлбэр
                      </p>
                      <div className="space-y-2">
                        {report.companies.map((company) => (
                          <div
                            key={company.contractId}
                            className="rounded-xl bg-slate-50 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-black">
                                  {company.companyName}
                                </p>
                                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                                  {company.orderCount} захиалга
                                </p>
                              </div>
                              <p className="text-sm font-black text-emerald-800">
                                {formatMoney(company.total)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-slate-100">
                      <table className="w-full min-w-[760px] text-left text-xs">
                        <thead className="bg-slate-50 font-black uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="px-3 py-3">Огноо</th>
                            <th className="px-3 py-3">Байгууллага / ажилтан</th>
                            <th className="px-3 py-3">Захиалга</th>
                            <th className="px-3 py-3">Хоол</th>
                            <th className="px-3 py-3 text-right">Дүн</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {report.charges.length === 0 ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-4 py-10 text-center font-bold text-slate-400"
                              >
                                Энэ хугацаанд бүртгэл алга.
                              </td>
                            </tr>
                          ) : (
                            report.charges.map((charge) => (
                              <tr key={charge.id}>
                                <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-500">
                                  {formatDateTime(charge.orderedAt)}
                                </td>
                                <td className="px-3 py-3">
                                  <p className="font-black">
                                    {charge.companyName}
                                  </p>
                                  <p className="mt-1 font-semibold text-slate-500">
                                    {charge.employeeCode} ·{" "}
                                    {charge.employeeName}
                                  </p>
                                </td>
                                <td className="px-3 py-3 font-bold">
                                  {charge.ticketNo}
                                </td>
                                <td className="px-3 py-3 font-semibold text-slate-600">
                                  {charge.items
                                    .map(
                                      (item) =>
                                        `${item.productName} × ${item.qty}`,
                                    )
                                    .join(", ")}
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-black">
                                  {formatMoney(charge.amount)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : null}
            </section>
          </div>
        </section>
      </div>

      {showContractForm ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreateContract();
            }}
            className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Гэрээт байгууллага нэмэх</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Хүү болон төлбөрийн шийдэлгүй хоолны бүртгэл.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowContractForm(false)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2 text-xs font-black text-slate-600">
                Байгууллагын нэр
                <input
                  required
                  value={contractForm.customerOrganization}
                  onChange={(event) =>
                    setContractForm((current) => ({
                      ...current,
                      customerOrganization: event.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                />
              </label>
              <label className="sm:col-span-2 text-xs font-black text-slate-600">
                Регистрийн дугаар
                <input
                  value={contractForm.customerRegisterNo}
                  onChange={(event) =>
                    setContractForm((current) => ({
                      ...current,
                      customerRegisterNo: event.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                />
              </label>
              <label className="text-xs font-black text-slate-600">
                Эхлэх огноо
                <input
                  required
                  type="date"
                  value={contractForm.startDate}
                  onChange={(event) =>
                    setContractForm((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold"
                />
              </label>
              <label className="text-xs font-black text-slate-600">
                Дуусах огноо
                <input
                  required
                  type="date"
                  value={contractForm.endDate}
                  onChange={(event) =>
                    setContractForm((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold"
                />
              </label>
              <label className="sm:col-span-2 text-xs font-black text-slate-600">
                Тэмдэглэл
                <textarea
                  value={contractForm.note}
                  onChange={(event) =>
                    setContractForm((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold outline-none focus:border-emerald-500"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#11231d] text-sm font-black text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}{" "}
              Бүртгэх
            </button>
          </form>
        </div>
      ) : null}

      {showMemberForm && selectedContract ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreateMember();
            }}
            className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Гэрээт ажилтан нэмэх</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {selectedContract.customerOrganization}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMemberForm(false)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-black text-slate-600">
                Ажилтны код
                <input
                  required
                  value={memberForm.employeeCode}
                  onChange={(event) =>
                    setMemberForm((current) => ({
                      ...current,
                      employeeCode: event.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                />
              </label>
              <label className="text-xs font-black text-slate-600">
                Овог нэр
                <input
                  required
                  value={memberForm.fullName}
                  onChange={(event) =>
                    setMemberForm((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                />
              </label>
              <label className="text-xs font-black text-slate-600">
                Хэлтэс
                <input
                  value={memberForm.department}
                  onChange={(event) =>
                    setMemberForm((current) => ({
                      ...current,
                      department: event.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                />
              </label>
              <label className="text-xs font-black text-slate-600">
                PIN (4-8 орон)
                <input
                  required
                  inputMode="numeric"
                  minLength={4}
                  maxLength={8}
                  pattern="[0-9]{4,8}"
                  value={memberForm.pin}
                  onChange={(event) =>
                    setMemberForm((current) => ({
                      ...current,
                      pin: event.target.value.replace(/\D/g, "").slice(0, 8),
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-black tracking-widest outline-none focus:border-emerald-500"
                />
              </label>
              <label className="text-xs font-black text-slate-600">
                Өдрийн лимит (заавал биш)
                <input
                  inputMode="numeric"
                  value={memberForm.dailyLimit}
                  onChange={(event) =>
                    setMemberForm((current) => ({
                      ...current,
                      dailyLimit: event.target.value.replace(/\D/g, ""),
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                />
              </label>
              <label className="text-xs font-black text-slate-600">
                Сарын лимит (заавал биш)
                <input
                  inputMode="numeric"
                  value={memberForm.monthlyLimit}
                  onChange={(event) =>
                    setMemberForm((current) => ({
                      ...current,
                      monthlyLimit: event.target.value.replace(/\D/g, ""),
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-black text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}{" "}
              Ажилтан бүртгэх
            </button>
          </form>
        </div>
      ) : null}

      {selectedQrMember ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 text-center shadow-2xl">
            <div className="flex items-start justify-between gap-4 text-left">
              <div>
                <h2 className="text-xl font-black">Ажилтны QR карт</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {selectedQrMember.fullName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQrMember(null)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              ref={qrRef}
              className="mx-auto mt-6 w-fit rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <QrGenerator
                value={selectedQrMember.qrPayload}
                size={230}
                level="M"
              />
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-left">
              <p className="text-xs font-black text-slate-800">
                {selectedContract?.customerOrganization}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Код: {selectedQrMember.employeeCode}
                {selectedQrMember.department
                  ? ` · ${selectedQrMember.department}`
                  : ""}
              </p>
            </div>
            <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">
              QR карт дээр PIN хэвлэгдэхгүй. PIN-ийг ажилтанд тусад нь өгнө.
            </p>
            <button
              type="button"
              onClick={printMemberCard}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#11231d] text-sm font-black text-white"
            >
              <Printer className="h-4 w-4" /> QR карт хэвлэх
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
