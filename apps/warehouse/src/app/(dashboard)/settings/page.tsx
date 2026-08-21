"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Save,
  Building2,
  Bell,
  Shield,
  Palette,
  Check,
  CreditCard,
} from "lucide-react";
import { API, wmsFetch } from "@/lib/api";

type Warehouse = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  district: string | null;
  phone: string | null;
  capacity: number | null;
  isActive: boolean;
  paymentAccountId: string | null;
};

type PaymentAccount = {
  id: string;
  label: string;
  merchantName: string;
  merchantCode: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
};

export default function SettingsPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [savingPaymentWarehouseId, setSavingPaymentWarehouseId] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Warehouse>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("wms_user") || "{}");
    setUser(u);

    const load = async () => {
      try {
        const [warehouseRes, accountRes] = await Promise.all([
          wmsFetch(`${API}/warehouses`),
          wmsFetch(`${API}/warehouses/payment-accounts`),
        ]);
        if (warehouseRes.ok) {
          const data = await warehouseRes.json();
          setWarehouses(Array.isArray(data) ? data : data.warehouses || []);
        }
        if (accountRes.ok) {
          const data = await accountRes.json();
          setPaymentAccounts(Array.isArray(data.accounts) ? data.accounts : []);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const startEdit = (wh: Warehouse) => {
    setEditingId(wh.id);
    setEditForm({
      name: wh.name,
      address: wh.address || "",
      city: wh.city || "",
      district: wh.district || "",
      phone: wh.phone || "",
      capacity: wh.capacity || 0,
    });
  };

  const savePaymentAccount = async (warehouseId: string, accountId: string) => {
    setSavingPaymentWarehouseId(warehouseId);
    try {
      const res = await wmsFetch(
        `${API}/warehouses/${warehouseId}/payment-account`,
        {
          method: "PUT",
          body: JSON.stringify({ accountId }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.message || "Төлбөрийн данс хадгалахад алдаа гарлаа",
        );
      }
      setWarehouses((current) =>
        current.map((warehouse) =>
          warehouse.id === warehouseId
            ? { ...warehouse, paymentAccountId: data.paymentAccountId || null }
            : warehouse,
        ),
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Төлбөрийн данс хадгалахад алдаа гарлаа",
      );
    } finally {
      setSavingPaymentWarehouseId(null);
    }
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await wmsFetch(`${API}/warehouses/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setWarehouses(
          warehouses.map((wh) =>
            wh.id === editingId ? { ...wh, ...updated } : wh,
          ),
        );
        setEditingId(null);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      alert("Хадгалахад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {saved && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
          <Check className="h-4 w-4" />
          Амжилттай хадгалагдлаа
        </div>
      )}

      {/* User info */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
          <Shield className="h-4 w-4 text-blue-600" />
          Хэрэглэгчийн мэдээлэл
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Нэр
            </p>
            <p className="mt-1 font-medium text-slate-900">
              {user?.name || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Имэйл
            </p>
            <p className="mt-1 font-medium text-slate-900">
              {user?.email || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Эрх
            </p>
            <p className="mt-1 font-medium text-slate-900">
              {user?.role || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Байгууллага ID
            </p>
            <p className="mt-1 font-mono text-xs text-slate-600">
              {user?.organizationId || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Warehouses */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
          <Building2 className="h-4 w-4 text-blue-600" />
          Агуулахын тохиргоо
        </h2>

        <div className="space-y-3">
          {warehouses.map((wh) => (
            <div
              key={wh.id}
              className="rounded-lg border border-slate-100 bg-slate-50/50 p-4"
            >
              {editingId === wh.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">
                        Нэр
                      </label>
                      <input
                        value={editForm.name || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">
                        Утас
                      </label>
                      <input
                        value={editForm.phone || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, phone: e.target.value })
                        }
                        className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">
                      Хаяг
                    </label>
                    <input
                      value={editForm.address || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, address: e.target.value })
                      }
                      className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">
                        Хот
                      </label>
                      <input
                        value={editForm.city || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, city: e.target.value })
                        }
                        className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">
                        Дүүрэг
                      </label>
                      <input
                        value={editForm.district || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            district: e.target.value,
                          })
                        }
                        className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">
                        Багтаамж
                      </label>
                      <input
                        type="number"
                        value={editForm.capacity || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            capacity: parseInt(e.target.value) || 0,
                          })
                        }
                        className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="h-8 rounded-lg border border-slate-300 px-4 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Цуцлах
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                      Хадгалах
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {wh.name}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          wh.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {wh.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {[wh.city, wh.district, wh.address]
                        .filter(Boolean)
                        .join(", ") || "Хаяг оруулаагүй"}
                    </p>
                    {wh.phone && (
                      <p className="text-xs text-slate-400">📞 {wh.phone}</p>
                    )}
                  </div>
                  <button
                    onClick={() => startEdit(wh)}
                    className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-white"
                  >
                    Засах
                  </button>
                </div>
              )}
            </div>
          ))}

          {warehouses.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">
              Агуулах бүртгэгдээгүй байна
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900">
          <CreditCard className="h-4 w-4 text-blue-600" />
          Татан авалтын Minu төлбөрийн данс
        </h2>
        <p className="mb-4 text-xs leading-5 text-slate-500">
          Эзэмшигч болон худалдааны төлөөлөгчийн QR төлбөр тухайн агуулахад
          сонгосон Minu Dynamic QR дансанд орно.
        </p>
        <div className="space-y-3">
          {warehouses.map((warehouse) => (
            <div
              key={warehouse.id}
              className="rounded-lg border border-blue-100 bg-white p-4"
            >
              <p className="mb-2 text-sm font-semibold text-slate-900">
                {warehouse.name}
              </p>
              <select
                value={warehouse.paymentAccountId || ""}
                disabled={savingPaymentWarehouseId === warehouse.id}
                onChange={(event) =>
                  savePaymentAccount(warehouse.id, event.target.value)
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              >
                <option value="">Данс сонгоогүй — QR төлбөр хаалттай</option>
                {paymentAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.bankName} ·{" "}
                    {account.accountNumber || account.merchantCode} ·{" "}
                    {account.accountHolder}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {paymentAccounts.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
              Холбосон Minu данс алга. System Admin → Төлбөрийн данс хэсэгт
              эхлээд Minu Dynamic QR дансаа нэг удаа холбоно уу.
            </div>
          )}
        </div>
      </div>

      {/* App info */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
          <Palette className="h-4 w-4 text-blue-600" />
          Системийн мэдээлэл
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Хувилбар</span>
            <span className="font-mono text-xs text-slate-700">1.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Платформ</span>
            <span className="text-xs text-slate-700">MGL Store WMS</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">API</span>
            <span className="font-mono text-xs text-slate-700">
              {API.replace("/api", "")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
