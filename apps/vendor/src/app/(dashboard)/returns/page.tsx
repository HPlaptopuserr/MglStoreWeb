"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import {
  RotateCcw,
  Plus,
  Package,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

type ReturnStatus = "pending" | "approved" | "rejected" | "completed";
type ShipmentStatus = "pending" | "shipped" | "delivered" | "received";

type Product = {
  id: string;
  name: string;
  sku: string;
  description?: string;
  image?: string;
  images?: string[];
};

type Shipment = {
  id: string;
  productId: string;
  quantity: number;
  status: ShipmentStatus;
};

type ReturnRequest = {
  id: string;
  shipmentId: string;
  reason: string;
  status: ReturnStatus;
  requestedAt: string;
};

const MOCK_PRODUCTS: Product[] = [
  {
    id: "prod-001",
    name: "Wireless Headphones",
    sku: "WH-001-BLK",
    description: "Noise cancelling wireless headphones",
  },
  {
    id: "prod-002",
    name: "Gaming Mouse",
    sku: "GM-002-RGB",
    description: "RGB gaming mouse",
  },
  {
    id: "prod-003",
    name: "Smart Watch",
    sku: "SW-003-SLV",
    description: "Health tracking smartwatch",
  },
];

const MOCK_SHIPMENTS: Shipment[] = [
  {
    id: "ship-001",
    productId: "prod-001",
    quantity: 2,
    status: "delivered",
  },
  {
    id: "ship-002",
    productId: "prod-002",
    quantity: 1,
    status: "received",
  },
  {
    id: "ship-003",
    productId: "prod-003",
    quantity: 3,
    status: "shipped",
  },
];

const MOCK_RETURNS: ReturnRequest[] = [
  {
    id: "ret-001",
    shipmentId: "ship-001",
    reason: "Damaged item",
    status: "pending",
    requestedAt: new Date().toISOString(),
  },
];

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newReturn, setNewReturn] = useState({
    shipmentId: "",
    reason: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setReturns(MOCK_RETURNS);
      setShipments(MOCK_SHIPMENTS);
      setProducts(MOCK_PRODUCTS);
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  const resetForm = () => {
    setNewReturn({ shipmentId: "", reason: "" });
    setIsAdding(false);
  };

  const getShipmentProduct = (shipmentId: string) => {
    const shipment = shipments.find((s) => s.id === shipmentId);
    if (!shipment) return null;
    return products.find((p) => p.id === shipment.productId) || null;
  };

  const eligibleShipments = useMemo(() => {
    return shipments.filter(
      (shipment) =>
        (shipment.status === "delivered" || shipment.status === "received") &&
        !returns.some((request) => request.shipmentId === shipment.id),
    );
  }, [shipments, returns]);

  const handleCreateReturn = (e: React.FormEvent) => {
    e.preventDefault();

    const createdReturn: ReturnRequest = {
      id: `ret-${Date.now()}`,
      shipmentId: newReturn.shipmentId,
      reason: newReturn.reason,
      status: "pending",
      requestedAt: new Date().toISOString(),
    };

    setReturns((prev) => [createdReturn, ...prev]);
    resetForm();
  };

  const handleUpdateStatus = (
    requestId: string,
    newStatus: ReturnRequest["status"],
  ) => {
    setReturns((prev) =>
      prev.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status: newStatus,
            }
          : request,
      ),
    );
  };

  const getStatusColor = (status: ReturnRequest["status"]) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      case "completed":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-amber-100 text-amber-700";
    }
  };

  const getStatusIcon = (status: ReturnRequest["status"]) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-8 p-2">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-slate-900">
            Returns
          </h2>
          <p className="mt-1 font-medium text-slate-500">
            Manage product return requests
          </p>
        </div>

        <Button
          onClick={() => setIsAdding((prev) => !prev)}
          className="rounded-full bg-black px-6 py-6 text-white shadow-lg shadow-black/20 transition-all hover:scale-105 hover:bg-slate-800"
        >
          <Plus className="mr-2 h-5 w-5" />
          <span className="font-bold">Create Return</span>
        </Button>
      </div>

      {isAdding && (
        <Card className="animate-in slide-in-from-top-4 overflow-hidden rounded-3xl border-none shadow-2xl shadow-slate-200 fade-in duration-300">
          <div className="bg-black p-6">
            <h3 className="text-xl font-black text-white">
              New Return Request
            </h3>
            <p className="text-sm font-medium text-white/70">
              Select a shipment to return
            </p>
          </div>

          <CardContent className="p-8">
            <form onSubmit={handleCreateReturn} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Select Shipment
                  </label>

                  <select
                    className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-black"
                    value={newReturn.shipmentId}
                    onChange={(e) =>
                      setNewReturn({
                        ...newReturn,
                        shipmentId: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select a shipment...</option>
                    {eligibleShipments.map((shipment) => {
                      const product = products.find(
                        (p) => p.id === shipment.productId,
                      );

                      return (
                        <option key={shipment.id} value={shipment.id}>
                          #{shipment.id.slice(0, 6)} -{" "}
                          {product?.name || "Unknown Product"} (
                          {shipment.quantity} units)
                        </option>
                      );
                    })}
                  </select>

                  {eligibleShipments.length === 0 && (
                    <p className="mt-1 text-xs font-medium text-amber-600">
                      No eligible shipments found (must be delivered/received
                      and not already returned).
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Reason for Return
                  </label>
                  <Input
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-medium focus:border-black focus:ring-black"
                    placeholder="e.g. Damaged item, Wrong product..."
                    value={newReturn.reason}
                    onChange={(e) =>
                      setNewReturn({ ...newReturn, reason: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetForm}
                  className="h-12 rounded-xl px-6 font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!newReturn.shipmentId || !newReturn.reason.trim()}
                  className="h-12 rounded-xl bg-[#FFAD02] px-8 font-bold text-black shadow-lg shadow-orange-500/20 hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Submit Request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-black"></div>
          </div>
        ) : returns.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
              <RotateCcw className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              No return requests
            </h3>
            <p className="mt-1 text-slate-500">
              Create a return request for eligible shipments.
            </p>
          </div>
        ) : (
          returns.map((request) => {
            const product = getShipmentProduct(request.shipmentId);

            return (
              <div
                key={request.id}
                className="group flex flex-col justify-between gap-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/80 md:flex-row md:items-center"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border-2 border-white bg-slate-100 shadow-md">
                    {product?.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full rounded-2xl object-cover"
                      />
                    ) : (
                      <Package className="h-8 w-8 text-slate-400" />
                    )}
                  </div>

                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-bold text-slate-600">
                        #{request.id.slice(0, 6)}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        • Shipment #{request.shipmentId.slice(0, 6)}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-slate-900">
                      {product?.name || "Unknown Product"}
                    </h3>

                    <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-500">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      Reason: {request.reason}
                    </p>
                  </div>
                </div>

                <div className="flex w-full items-center gap-6 md:w-auto md:justify-end">
                  <div className="flex flex-col items-end gap-1">
                    <div
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${getStatusColor(
                        request.status,
                      )}`}
                    >
                      {getStatusIcon(request.status)}
                      {request.status}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <Calendar className="h-3 w-3" />
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </div>
                  </div>

                  {request.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() =>
                          handleUpdateStatus(request.id, "approved")
                        }
                        className="rounded-xl bg-green-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-green-500/20 hover:bg-green-600"
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() =>
                          handleUpdateStatus(request.id, "rejected")
                        }
                        className="rounded-xl bg-red-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-red-500/20 hover:bg-red-600"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
