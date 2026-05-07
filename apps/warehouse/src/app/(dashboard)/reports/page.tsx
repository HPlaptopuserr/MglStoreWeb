"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  Calendar,
  Truck,
  ClipboardList,
  X,
} from "lucide-react";
import { API, wmsFetch } from "@/lib/api";

/* ─── Types ───────────────────────────────────────────────────────────── */
type WarehouseOption = { id: string; name: string };

type InventoryItem = {
  id: string;
  quantity: number;
  minQuantity: number | null;
  maxQuantity: number | null;
  product: { id: string; name: string; sku: string | null; price: number };
};

type WarehouseDetail = {
  id: string;
  name: string;
  inventories: InventoryItem[];
};

type DispatchItem = {
  id: string;
  product: { id: string; name: string; sku: string | null; price: number };
  quantity: number;
  dispatchedQuantity?: number | null;
};

type Dispatch = {
  id: string;
  createdAt: string;
  status: string;
  request: {
    id: string;
    items: DispatchItem[];
    organization: { id: string; name: string } | null;
    requestedBy?: { email: string; profile?: { fullName: string | null } | null } | null;
  } | null;
  warehouse: { id: string; name: string; address?: string | null } | null;
  organization?: { id: string; name: string } | null;
};

type LedgerEntry = {
  id: string;
  createdAt: string;
  reason: string;
  change: number;
  note: string | null;
  product: { id: string; name: string; sku: string | null };
  createdBy: { email: string; profile?: { fullName: string | null } | null } | null;
};

/* ─── Period helpers ──────────────────────────────────────────────────── */
type PeriodKey = "today" | "week" | "month" | "quarter" | "year" | "custom";

function getPeriodRange(key: PeriodKey, customFrom: string, customTo: string): { from: Date; to: Date } {
  const now = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  const endOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

  switch (key) {
    case "today":
      return { from: startOf(now), to: endOf(now) };
    case "week": {
      const day = now.getDay();
      const diff = (day === 0 ? -6 : 1 - day);
      const mon = new Date(now); mon.setDate(now.getDate() + diff);
      return { from: startOf(mon), to: endOf(now) };
    }
    case "month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOf(now) };
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return { from: new Date(now.getFullYear(), q * 3, 1), to: endOf(now) };
    }
    case "year":
      return { from: new Date(now.getFullYear(), 0, 1), to: endOf(now) };
    case "custom": {
      const f = customFrom ? new Date(customFrom) : startOf(now);
      const t = customTo ? endOf(new Date(customTo)) : endOf(now);
      return { from: f, to: t };
    }
  }
}

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Өнөөдөр",
  week: "Энэ 7 хоног",
  month: "Энэ сар",
  quarter: "Энэ улирал",
  year: "Энэ жил",
  custom: "Дурын огноо",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("mn-MN", {
    year: "numeric", month: "2-digit", day: "2-digit",
  });
}

function fmtMoney(n: number) {
  return n.toLocaleString("mn-MN") + "₮";
}

/* ─── Component ───────────────────────────────────────────────────────── */
export default function ReportsPage() {
  const [tab, setTab] = useState<"inventory" | "dispatch" | "ledger">("inventory");
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [detail, setDetail] = useState<WarehouseDetail | null>(null);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  /* Load warehouses once */
  useEffect(() => {
    const load = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("wms_user") || "{}");
        let url = `${API}/warehouses`;
        if (user.organizationId) url = `${API}/warehouses/organization/${user.organizationId}`;
        const res = await wmsFetch(url);
        if (res.ok) {
          const data = await res.json();
          const list: WarehouseOption[] = Array.isArray(data) ? data : data.warehouses || [];
          setWarehouses(list);
          if (list.length > 0) setWarehouseId(list[0].id);
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    };
    load();
  }, []);

  /* Load inventory detail */
  const fetchDetail = useCallback(async () => {
    if (!warehouseId) return;
    setLoading(true);
    try {
      let mergedDetail: any = null;
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const res = await wmsFetch(`${API}/warehouses/${warehouseId}/detail?invPage=${page}&invLimit=200`);
        if (res.ok) {
          const data = await res.json();
          if (!mergedDetail) {
            mergedDetail = data;
          } else {
            mergedDetail.inventories = [...mergedDetail.inventories, ...(data.inventories || [])];
          }
          if (data.pagination && data.pagination.page < data.pagination.totalPages) {
            page++;
          } else {
            hasMore = false;
          }
        } else {
          break;
        }
      }
      if (mergedDetail) setDetail(mergedDetail);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [warehouseId]);

  /* Load dispatches */
  const fetchDispatches = useCallback(async () => {
    if (!warehouseId) return;
    setLoading(true);
    try {
      const res = await wmsFetch(`${API}/stock-requests/warehouse/${warehouseId}/dispatches`);
      if (res.ok) setDispatches(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [warehouseId]);

  /* Load ledger */
  const fetchLedger = useCallback(async () => {
    if (!warehouseId) return;
    setLoading(true);
    try {
      const { from, to } = getPeriodRange(period, customFrom, customTo);
      const params = new URLSearchParams({
        warehouseId,
        from: from.toISOString(),
        to: to.toISOString(),
        limit: "100",
      });
      const res = await wmsFetch(`${API}/inventory-ledger?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLedger(Array.isArray(data) ? data : data.entries || []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [warehouseId, period, customFrom, customTo]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);
  useEffect(() => { if (tab === "dispatch") fetchDispatches(); }, [tab, fetchDispatches]);
  useEffect(() => { if (tab === "ledger") fetchLedger(); }, [tab, fetchLedger]);

  /* Period filter applied to dispatches */
  const { from: pFrom, to: pTo } = useMemo(
    () => getPeriodRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

  const filteredDispatches = useMemo(() =>
    dispatches.filter((d) => {
      const t = new Date(d.createdAt).getTime();
      return t >= pFrom.getTime() && t <= pTo.getTime();
    }), [dispatches, pFrom, pTo]);

  /* Flatten dispatch rows for table */
  type DispatchRow = {
    dispatchId: string;
    date: string;
    orderId: string;
    destination: string;
    productName: string;
    sku: string;
    qty: number;
    unitPrice: number;
    total: number;
  };

  const dispatchRows = useMemo<DispatchRow[]>(() => {
    const rows: DispatchRow[] = [];
    for (const d of filteredDispatches) {
      const items = d.request?.items || [];
      const dest = d.request?.organization?.name || d.organization?.name || "—";
      for (const item of items) {
        const qty = item.dispatchedQuantity ?? item.quantity;
        const price = item.product?.price || 0;
        rows.push({
          dispatchId: d.id,
          date: d.createdAt,
          orderId: d.request?.id?.slice(-8).toUpperCase() || d.id.slice(-8).toUpperCase(),
          destination: dest,
          productName: item.product?.name || "—",
          sku: item.product?.sku || "—",
          qty,
          unitPrice: price,
          total: qty * price,
        });
      }
    }
    return rows;
  }, [filteredDispatches]);

  const dispatchSummary = useMemo(() => ({
    count: filteredDispatches.length,
    totalQty: dispatchRows.reduce((s, r) => s + r.qty, 0),
    totalValue: dispatchRows.reduce((s, r) => s + r.total, 0),
  }), [filteredDispatches, dispatchRows]);

  /* Inventory stats */
  const inventories = detail?.inventories || [];
  const totalProducts = inventories.length;
  const totalStock = inventories.reduce((s, i) => s + i.quantity, 0);
  const totalValue = inventories.reduce((s, i) => s + i.quantity * (i.product.price || 0), 0);
  const lowStockItems = inventories.filter((i) => i.minQuantity && i.quantity > 0 && i.quantity <= i.minQuantity);
  const outOfStockItems = inventories.filter((i) => i.quantity <= 0);
  const healthyItems = inventories.filter((i) => i.quantity > 0 && (!i.minQuantity || i.quantity > i.minQuantity));
  const topByQty = [...inventories].sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  const topByValue = [...inventories]
    .sort((a, b) => b.quantity * (b.product.price || 0) - a.quantity * (a.product.price || 0))
    .slice(0, 10);
  const maxQty = topByQty[0]?.quantity || 1;
  const maxVal = topByValue[0] ? topByValue[0].quantity * (topByValue[0].product.price || 0) : 1;

  /* Excel export for dispatches */
  const handleExcelDispatch = () => {
    if (!dispatchRows.length) return;
    const whName = warehouses.find((w) => w.id === warehouseId)?.name || "Агуулах";
    const periodLabel = period === "custom"
      ? `${customFrom} ~ ${customTo}`
      : PERIOD_LABELS[period];

    const header = `
      <tr style="background:#1e40af;color:#fff;font-weight:bold">
        <td>№</td><td>Огноо</td><td>Захиалгын №</td><td>Хүлээн авагч</td>
        <td>Бараа</td><td>SKU</td><td>Тоо ширхэг</td><td>Нэгж үнэ (₮)</td><td>Нийт үнэ (₮)</td>
      </tr>`;
    const bodyRows = dispatchRows
      .map((r, i) => `
        <tr style="background:${i % 2 === 0 ? "#f8fafc" : "#fff"}">
          <td>${i + 1}</td>
          <td>${fmtDate(r.date)}</td>
          <td>${r.orderId}</td>
          <td>${r.destination}</td>
          <td>${r.productName}</td>
          <td>${r.sku}</td>
          <td style="text-align:right">${r.qty.toLocaleString()}</td>
          <td style="text-align:right">${r.unitPrice.toLocaleString()}</td>
          <td style="text-align:right">${r.total.toLocaleString()}</td>
        </tr>`)
      .join("");
    const footRow = `
      <tr style="background:#1e40af;color:#fff;font-weight:bold">
        <td colspan="6">Нийт</td>
        <td style="text-align:right">${dispatchSummary.totalQty.toLocaleString()}</td>
        <td></td>
        <td style="text-align:right">${dispatchSummary.totalValue.toLocaleString()}</td>
      </tr>`;

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"/></head>
      <body>
        <table border="1" cellpadding="4" style="font-family:Arial;font-size:12px;border-collapse:collapse">
          <tr><td colspan="9" style="font-size:16px;font-weight:bold;background:#1e40af;color:#fff">
            ${whName} — Гаргалтын тайлан (${periodLabel})
          </td></tr>
          ${header}${bodyRows}${footRow}
        </table>
      </body></html>`;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dispatch-report-${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* Excel export for inventory */
  const handleExcelInventory = () => {
    if (!inventories.length) return;
    const whName = warehouses.find((w) => w.id === warehouseId)?.name || "Агуулах";
    const header = `<tr style="background:#1e40af;color:#fff;font-weight:bold">
      <td>№</td><td>Бараа</td><td>SKU</td><td>Тоо ширхэг</td>
      <td>Хамгийн бага</td><td>Нэгж үнэ (₮)</td><td>Нийт үнэ (₮)</td><td>Төлөв</td>
    </tr>`;
    const bodyRows = inventories.map((item, i) => {
      const st = item.quantity <= 0 ? "Дууссан" : (item.minQuantity && item.quantity <= item.minQuantity ? "Дутагдал" : "Хэвийн");
      return `<tr style="background:${i % 2 === 0 ? "#f8fafc" : "#fff"}">
        <td>${i + 1}</td>
        <td>${item.product.name}</td>
        <td>${item.product.sku || ""}</td>
        <td style="text-align:right">${item.quantity.toLocaleString()}</td>
        <td style="text-align:right">${item.minQuantity || ""}</td>
        <td style="text-align:right">${(item.product.price || 0).toLocaleString()}</td>
        <td style="text-align:right">${(item.quantity * (item.product.price || 0)).toLocaleString()}</td>
        <td>${st}</td>
      </tr>`;
    }).join("");
    const footRow = `<tr style="background:#1e40af;color:#fff;font-weight:bold">
      <td colspan="3">Нийт</td>
      <td style="text-align:right">${totalStock.toLocaleString()}</td>
      <td></td><td></td>
      <td style="text-align:right">${totalValue.toLocaleString()}</td>
      <td></td>
    </tr>`;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"/></head>
      <body>
        <table border="1" cellpadding="4" style="font-family:Arial;font-size:12px;border-collapse:collapse">
          <tr><td colspan="8" style="font-size:16px;font-weight:bold;background:#1e40af;color:#fff">
            ${whName} — Нөөцийн тайлан (${new Date().toLocaleDateString("mn-MN")})
          </td></tr>
          ${header}${bodyRows}${footRow}
        </table>
      </body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-report-${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* Print — open new window with formatted content */
  const handlePrint = () => {
    const periodLabel = period === "custom"
      ? `${customFrom} ~ ${customTo}`
      : PERIOD_LABELS[period];
    const today = new Date().toLocaleDateString("mn-MN");

    let bodyHtml = "";

    if (tab === "inventory") {
      const rows = inventories.map((item, i) => {
        const st = item.quantity <= 0 ? "Дууссан" : (item.minQuantity && item.quantity <= item.minQuantity ? "Дутагдал" : "Хэвийн");
        const rowBg = i % 2 === 0 ? "#f8fafc" : "#fff";
        return `<tr style="background:${rowBg}">
          <td style="text-align:center">${i + 1}</td>
          <td>${item.product.name}</td>
          <td style="font-family:monospace">${item.product.sku || ""}</td>
          <td style="text-align:right">${item.quantity.toLocaleString()}</td>
          <td style="text-align:right">${item.minQuantity ?? ""}</td>
          <td style="text-align:right">${fmtMoney(item.product.price || 0)}</td>
          <td style="text-align:right;font-weight:bold">${fmtMoney(item.quantity * (item.product.price || 0))}</td>
          <td style="color:${st === "Дууссан" ? "#dc2626" : st === "Дутагдал" ? "#d97706" : "#16a34a"}">${st}</td>
        </tr>`;
      }).join("");
      bodyHtml = `
        <h2 style="margin:0 0 4px">Нөөцийн тайлан</h2>
        <p style="margin:0 0 16px;color:#64748b">Агуулах: <b>${whName}</b> | Огноо: ${today}</p>
        <div style="display:flex;gap:24px;margin-bottom:16px">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 20px">
            <div style="font-size:11px;color:#16a34a;font-weight:600">НИЙТ ҮНЭ ЦЭНЭ</div>
            <div style="font-size:22px;font-weight:bold;color:#15803d">${fmtMoney(totalValue)}</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 20px">
            <div style="font-size:11px;color:#64748b;font-weight:600">НИЙТ БАРАА</div>
            <div style="font-size:22px;font-weight:bold">${totalProducts}</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 20px">
            <div style="font-size:11px;color:#64748b;font-weight:600">НИЙТ НӨӨЦ</div>
            <div style="font-size:22px;font-weight:bold">${totalStock.toLocaleString()}</div>
          </div>
        </div>
        <table>
          <thead><tr>
            <th>№</th><th style="text-align:left">Бараа</th><th>SKU</th>
            <th style="text-align:right">Тоо</th><th style="text-align:right">Min</th>
            <th style="text-align:right">Нэгж үнэ</th><th style="text-align:right">Нийт үнэ</th><th>Төлөв</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr style="background:#1e3a8a;color:#fff;font-weight:bold">
            <td colspan="3">Нийт</td>
            <td style="text-align:right">${totalStock.toLocaleString()}</td>
            <td></td><td></td>
            <td style="text-align:right">${fmtMoney(totalValue)}</td>
            <td></td>
          </tr></tfoot>
        </table>`;
    } else if (tab === "dispatch") {
      const rows = dispatchRows.map((row, i) => {
        const rowBg = i % 2 === 0 ? "#f8fafc" : "#fff";
        return `<tr style="background:${rowBg}">
          <td style="text-align:center">${i + 1}</td>
          <td style="white-space:nowrap">${fmtDate(row.date)}</td>
          <td style="font-family:monospace">#${row.orderId}</td>
          <td>${row.destination}</td>
          <td>${row.productName}</td>
          <td style="font-family:monospace">${row.sku}</td>
          <td style="text-align:right">${row.qty.toLocaleString()}</td>
          <td style="text-align:right">${fmtMoney(row.unitPrice)}</td>
          <td style="text-align:right;font-weight:bold;color:#15803d">${fmtMoney(row.total)}</td>
        </tr>`;
      }).join("");
      bodyHtml = `
        <h2 style="margin:0 0 4px">Гаргалтын тайлан</h2>
        <p style="margin:0 0 16px;color:#64748b">Агуулах: <b>${whName}</b> | Хугацаа: ${periodLabel} | Огноо: ${today}</p>
        <div style="display:flex;gap:24px;margin-bottom:16px">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 20px">
            <div style="font-size:11px;color:#16a34a;font-weight:600">НИЙТ МӨНГӨН ДҮН</div>
            <div style="font-size:22px;font-weight:bold;color:#15803d">${fmtMoney(dispatchSummary.totalValue)}</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 20px">
            <div style="font-size:11px;color:#64748b;font-weight:600">НИЙТ ГАРГАЛТ</div>
            <div style="font-size:22px;font-weight:bold">${dispatchSummary.count}</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 20px">
            <div style="font-size:11px;color:#64748b;font-weight:600">НИЙТ ТОО ШИРХЭГ</div>
            <div style="font-size:22px;font-weight:bold">${dispatchSummary.totalQty.toLocaleString()}</div>
          </div>
        </div>
        <table>
          <thead><tr>
            <th>№</th><th>Огноо</th><th>Захиалга №</th><th style="text-align:left">Хүлээн авагч</th>
            <th style="text-align:left">Бараа</th><th>SKU</th>
            <th style="text-align:right">Тоо</th><th style="text-align:right">Нэгж үнэ</th><th style="text-align:right">Нийт үнэ</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr style="background:#1e3a8a;color:#fff;font-weight:bold">
            <td colspan="6">Нийт дүн</td>
            <td style="text-align:right">${dispatchSummary.totalQty.toLocaleString()}</td>
            <td></td>
            <td style="text-align:right">${fmtMoney(dispatchSummary.totalValue)}</td>
          </tr></tfoot>
        </table>`;
    } else {
      const rows = ledger.map((entry, i) => {
        const rowBg = i % 2 === 0 ? "#f8fafc" : "#fff";
        const chg = entry.change;
        return `<tr style="background:${rowBg}">
          <td style="white-space:nowrap">${fmtDate(entry.createdAt)}</td>
          <td>${entry.product.name}</td>
          <td style="font-family:monospace">${entry.product.sku || ""}</td>
          <td>${entry.reason}</td>
          <td style="text-align:right;font-weight:bold;color:${chg > 0 ? "#16a34a" : "#dc2626"}">${chg > 0 ? "+" : ""}${chg.toLocaleString()}</td>
          <td>${entry.note || ""}</td>
          <td>${entry.createdBy?.profile?.fullName || entry.createdBy?.email || ""}</td>
        </tr>`;
      }).join("");
      const totalIn = ledger.filter((e) => e.change > 0).reduce((s, e) => s + e.change, 0);
      const totalOut = Math.abs(ledger.filter((e) => e.change < 0).reduce((s, e) => s + e.change, 0));
      bodyHtml = `
        <h2 style="margin:0 0 4px">Хөдөлгөөний тайлан</h2>
        <p style="margin:0 0 16px;color:#64748b">Агуулах: <b>${whName}</b> | Хугацаа: ${periodLabel} | Огноо: ${today}</p>
        <div style="display:flex;gap:24px;margin-bottom:16px">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 20px">
            <div style="font-size:11px;color:#16a34a;font-weight:600">НИЙТ ОРЛОГО (+)</div>
            <div style="font-size:22px;font-weight:bold;color:#15803d">+${totalIn.toLocaleString()}</div>
          </div>
          <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:8px;padding:12px 20px">
            <div style="font-size:11px;color:#dc2626;font-weight:600">НИЙТ ЗАРЛАГА (−)</div>
            <div style="font-size:22px;font-weight:bold;color:#dc2626">−${totalOut.toLocaleString()}</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 20px">
            <div style="font-size:11px;color:#64748b;font-weight:600">НИЙТ ХӨДӨЛГӨӨН</div>
            <div style="font-size:22px;font-weight:bold">${ledger.length}</div>
          </div>
        </div>
        <table>
          <thead><tr>
            <th>Огноо</th><th style="text-align:left">Бараа</th><th>SKU</th>
            <th>Шалтгаан</th><th style="text-align:right">Өөрчлөлт</th>
            <th style="text-align:left">Тэмдэглэл</th><th style="text-align:left">Хэрэглэгч</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    }

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html lang="mn"><head>
      <meta charset="utf-8"/>
      <title>MGL WMS — Тайлан</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 32px; }
        h2 { font-size: 20px; font-weight: 800; color: #1e3a8a; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #1e3a8a; color: #fff; padding: 7px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
        td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
        tfoot td { border-top: 2px solid #1e3a8a; }
        @media print {
          body { padding: 16px; }
          button { display: none !important; }
        }
      </style>
    </head><body>
      ${bodyHtml}
      <div style="margin-top:24px;text-align:right">
        <button onclick="window.print();window.close()"
          style="background:#1e3a8a;color:#fff;border:none;padding:10px 28px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">
          🖨️ Хэвлэх
        </button>
      </div>
    </body></html>`);
    win.document.close();
  };

  if (loading && !detail && !dispatches.length) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const whName = warehouses.find((w) => w.id === warehouseId)?.name || "Агуулах";

  return (
    <>
      <div className="space-y-5">
        {/* ── Top bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Warehouse */}
            <div className="relative">
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-sm font-medium outline-none focus:border-blue-400"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Period pills — only for dispatch/ledger tabs */}
            {tab !== "inventory" && (
              <div className="flex flex-wrap items-center gap-1">
                {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => { setPeriod(k); if (k === "custom") setShowCustom(true); else setShowCustom(false); }}
                    className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
                      period === k
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
                    }`}
                  >
                    {PERIOD_LABELS[k]}
                  </button>
                ))}
                {showCustom && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                    <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                      className="w-32 bg-transparent text-xs outline-none" />
                    <span className="text-xs text-slate-400">~</span>
                    <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                      className="w-32 bg-transparent text-xs outline-none" />
                    <button onClick={() => { setShowCustom(false); setPeriod("month"); }}>
                      <X className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {tab === "inventory" && (
              <button onClick={handleExcelInventory}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Excel татах
              </button>
            )}
            {tab === "dispatch" && (
              <button onClick={handleExcelDispatch}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Excel татах
              </button>
            )}
            <button onClick={handlePrint}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
              <Printer className="h-4 w-4 text-slate-500" />
              Хэвлэх
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 w-fit">
          {([
            { key: "inventory", label: "Нөөцийн тайлан", icon: Package },
            { key: "dispatch",  label: "Гаргалтын тайлан", icon: Truck },
            { key: "ledger",    label: "Хөдөлгөөний тайлан", icon: ClipboardList },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                tab === key ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ════════════════ INVENTORY TAB ════════════════ */}
        {tab === "inventory" && (
          <div className="space-y-5">
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[
                { icon: Package, label: "Нийт бараа", value: totalProducts, cls: "text-slate-900", dot: "" },
                { icon: BarChart3, label: "Нийт нөөц", value: totalStock.toLocaleString(), cls: "text-slate-900", dot: "" },
                { icon: TrendingUp, label: "Нийт үнэ цэнэ", value: fmtMoney(totalValue), cls: "text-emerald-600", dot: "text-emerald-500" },
                { icon: AlertTriangle, label: "Дутагдалтай", value: lowStockItems.length, cls: "text-amber-600", dot: "text-amber-500" },
                { icon: TrendingDown, label: "Дууссан", value: outOfStockItems.length, cls: "text-red-600", dot: "text-red-500" },
              ].map(({ icon: Icon, label, value, cls, dot }) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${dot || "text-slate-400"}`}>
                    <Icon className="h-3.5 w-3.5" />{label}
                  </div>
                  <p className={`mt-2 text-2xl font-bold ${cls}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Stock health bar */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-bold text-slate-900">Нөөцийн төлөв</h3>
              <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
                {totalProducts > 0 && (<>
                  <div className="bg-emerald-500 transition-all" style={{ width: `${(healthyItems.length / totalProducts) * 100}%` }} />
                  <div className="bg-amber-400 transition-all" style={{ width: `${(lowStockItems.length / totalProducts) * 100}%` }} />
                  <div className="bg-red-500 transition-all" style={{ width: `${(outOfStockItems.length / totalProducts) * 100}%` }} />
                </>)}
              </div>
              <div className="mt-3 flex gap-6 text-xs">
                {[
                  { label: `Хэвийн (${healthyItems.length})`, bg: "bg-emerald-500" },
                  { label: `Дутагдал (${lowStockItems.length})`, bg: "bg-amber-400" },
                  { label: `Дууссан (${outOfStockItems.length})`, bg: "bg-red-500" },
                ].map(({ label, bg }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`h-2.5 w-2.5 rounded-full ${bg}`} />
                    <span className="text-slate-600">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Two-col charts */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-4 text-sm font-bold text-slate-900">Тоо ширхэгээр Топ 10</h3>
                <div className="space-y-2.5">
                  {topByQty.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <span className="w-5 text-right text-xs font-bold text-slate-300">{idx + 1}</span>
                      <div className="flex-1">
                        <div className="mb-1 flex justify-between">
                          <p className="max-w-[180px] truncate text-xs font-medium text-slate-700">{item.product.name}</p>
                          <span className="text-xs font-bold text-slate-900">{item.quantity.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${(item.quantity / maxQty) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-4 text-sm font-bold text-slate-900">Үнэ цэнээрээ Топ 10</h3>
                <div className="space-y-2.5">
                  {topByValue.map((item, idx) => {
                    const val = item.quantity * (item.product.price || 0);
                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        <span className="w-5 text-right text-xs font-bold text-slate-300">{idx + 1}</span>
                        <div className="flex-1">
                          <div className="mb-1 flex justify-between">
                            <p className="max-w-[180px] truncate text-xs font-medium text-slate-700">{item.product.name}</p>
                            <span className="text-xs font-bold text-slate-900">{fmtMoney(val)}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(val / maxVal) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Low stock */}
            {lowStockItems.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-800">
                  <AlertTriangle className="h-4 w-4" />Дутагдалтай бараа ({lowStockItems.length})
                </h3>
                <div className="space-y-1.5">
                  {lowStockItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.product.name}</p>
                        <p className="text-xs text-slate-400">{item.product.sku || "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-amber-600">{item.quantity} / {item.minQuantity}</p>
                        <p className="text-[10px] text-slate-400">одоо / шаардлага</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Out of stock */}
            {outOfStockItems.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50/30 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-red-800">
                  <TrendingDown className="h-4 w-4" />Дууссан бараа ({outOfStockItems.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {outOfStockItems.map((item) => (
                    <span key={item.id} className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-700">{item.product.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════ DISPATCH TAB ════════════════ */}
        {tab === "dispatch" && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Нийт гаргалт</p>
                <p className="mt-1.5 text-2xl font-bold text-slate-900">{dispatchSummary.count}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Нийт тоо ширхэг</p>
                <p className="mt-1.5 text-2xl font-bold text-slate-900">{dispatchSummary.totalQty.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Нийт мөнгөн дүн</p>
                <p className="mt-1.5 text-2xl font-bold text-emerald-700">{fmtMoney(dispatchSummary.totalValue)}</p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-bold text-slate-900">
                  {whName} — Гаргалтын тайлан
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    ({PERIOD_LABELS[period]}{period === "custom" ? `: ${customFrom} ~ ${customTo}` : ""})
                  </span>
                </h3>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  {dispatchRows.length} мөр
                </span>
              </div>

              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : dispatchRows.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
                  <Truck className="h-8 w-8" />
                  <p className="text-sm">Гаргалт олдсонгүй</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-3 py-3">№</th>
                        <th className="px-3 py-3">Огноо</th>
                        <th className="px-3 py-3">Захиалга №</th>
                        <th className="px-3 py-3">Хүлээн авагч</th>
                        <th className="px-3 py-3">Бараа</th>
                        <th className="px-3 py-3">SKU</th>
                        <th className="px-3 py-3 text-right">Тоо</th>
                        <th className="px-3 py-3 text-right">Нэгж үнэ</th>
                        <th className="px-3 py-3 text-right">Нийт үнэ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dispatchRows.map((row, i) => (
                        <tr key={`${row.dispatchId}-${i}`}
                          className="border-b border-slate-50 last:border-0 hover:bg-blue-50/50 transition-colors">
                          <td className="px-3 py-2.5 text-xs text-slate-400">{i + 1}</td>
                          <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{fmtDate(row.date)}</td>
                          <td className="px-3 py-2.5 font-mono text-xs text-blue-700">#{row.orderId}</td>
                          <td className="px-3 py-2.5 text-sm font-medium text-slate-800">{row.destination}</td>
                          <td className="px-3 py-2.5 text-sm text-slate-700">{row.productName}</td>
                          <td className="px-3 py-2.5 font-mono text-xs text-slate-400">{row.sku}</td>
                          <td className="px-3 py-2.5 text-right text-sm font-semibold text-slate-900">{row.qty.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right text-xs text-slate-600">{fmtMoney(row.unitPrice)}</td>
                          <td className="px-3 py-2.5 text-right text-sm font-bold text-emerald-700">{fmtMoney(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50">
                        <td colSpan={6} className="px-3 py-3 text-xs font-bold text-slate-600">НИЙТ ДҮН</td>
                        <td className="px-3 py-3 text-right text-sm font-bold text-slate-900">
                          {dispatchSummary.totalQty.toLocaleString()}
                        </td>
                        <td></td>
                        <td className="px-3 py-3 text-right text-sm font-bold text-emerald-700">
                          {fmtMoney(dispatchSummary.totalValue)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════ LEDGER TAB ════════════════ */}
        {tab === "ledger" && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Нийт хөдөлгөөн</p>
                <p className="mt-1.5 text-2xl font-bold text-slate-900">{ledger.length}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Нийт орлого (+)</p>
                <p className="mt-1.5 text-2xl font-bold text-emerald-700">
                  {ledger.filter((e) => e.change > 0).reduce((s, e) => s + e.change, 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Нийт зарлага (−)</p>
                <p className="mt-1.5 text-2xl font-bold text-red-700">
                  {Math.abs(ledger.filter((e) => e.change < 0).reduce((s, e) => s + e.change, 0)).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Хөдөлгөөний дэлгэрэнгүй
                  <span className="ml-2 text-xs font-normal text-slate-400">({PERIOD_LABELS[period]})</span>
                </h3>
              </div>
              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : ledger.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
                  <ClipboardList className="h-8 w-8" />
                  <p className="text-sm">Хөдөлгөөн олдсонгүй</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-3 py-3">Огноо</th>
                        <th className="px-3 py-3">Бараа</th>
                        <th className="px-3 py-3">SKU</th>
                        <th className="px-3 py-3">Шалтгаан</th>
                        <th className="px-3 py-3 text-right">Өөрчлөлт</th>
                        <th className="px-3 py-3">Тэмдэглэл</th>
                        <th className="px-3 py-3">Хэрэглэгч</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.map((entry) => (
                        <tr key={entry.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{fmtDate(entry.createdAt)}</td>
                          <td className="px-3 py-2.5 text-sm font-medium text-slate-800">{entry.product.name}</td>
                          <td className="px-3 py-2.5 font-mono text-xs text-slate-400">{entry.product.sku || "—"}</td>
                          <td className="px-3 py-2.5">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{entry.reason}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={`text-sm font-bold ${entry.change > 0 ? "text-emerald-600" : "text-red-600"}`}>
                              {entry.change > 0 ? "+" : ""}{entry.change.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-400">{entry.note || "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-slate-500">
                            {entry.createdBy?.profile?.fullName || entry.createdBy?.email || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </>
  );
}
