"use client";

import { useParams, useRouter } from "next/navigation";
import { WarehouseReceiptPrintView } from "@/features/receive/WarehouseReceiptPrintView";

export default function GoodsReceiptPrintPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  return <WarehouseReceiptPrintView id={id} onClose={() => router.back()} />;
}
