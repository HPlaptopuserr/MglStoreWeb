"use client";
import { useState } from "react";
import { useWarehouseScope } from "@/features/warehouse-scope/WarehouseScopeProvider";
import { TransferComposer } from "@/features/transfers/TransferComposer";
import { TransferInbox } from "@/features/transfers/TransferInbox";
export default function TransfersPage() {
  const { selectedWarehouseId, selectedWarehouse, isLoading, error } =
    useWarehouseScope();
  const [tab, setTab] = useState<"send" | "receive">("send");
  const [revision, setRevision] = useState(0);
  if (isLoading)
    return (
      <p role="status" className="p-8">
        Агуулах ачаалж байна…
      </p>
    );
  if (error)
    return (
      <p role="alert" className="p-8 text-red-700">
        {error}
      </p>
    );
  if (!selectedWarehouseId)
    return <p className="p-8 text-slate-500">Эхлээд агуулах сонгоно уу.</p>;
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Агуулах хоорондын шилжүүлэг</h1>
        <p className="mt-2 text-sm text-slate-500">
          Очих агуулах падааныг баталсны дараа бараа үлдэгдэлд нэмэгдэнэ.
        </p>
      </div>
      <nav aria-label="Шилжүүлгийн хэсэг" className="flex gap-2">
        {(
          [
            { id: "send", label: "Бараа илгээх" },
            { id: "receive", label: "Падаан / хүлээн авах" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-lg px-4 py-3 text-sm font-medium transition ${tab === item.id ? "bg-blue-600 text-white" : "border border-slate-200 bg-white hover:bg-blue-50"}`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {tab === "send" ? (
        <TransferComposer
          key={selectedWarehouseId}
          sourceId={selectedWarehouseId}
          sourceName={selectedWarehouse?.name ?? "Агуулах"}
          onSent={() => setRevision((value) => value + 1)}
        />
      ) : (
        <TransferInbox
          key={selectedWarehouseId}
          warehouseId={selectedWarehouseId}
          revision={revision}
        />
      )}
    </div>
  );
}
