"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "../../../components/ui/Card";
import { Warehouse, Package, Truck, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

type User = {
  displayName: string;
} | null;

export default function Dashboard() {
  const [user, setUser] = useState<User>(null);
  const [stats, setStats] = useState({
    warehouses: 0,
    products: 0,
    activeShipments: 0,
    pendingReceipts: 0,
    delivered: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Түр mock data
    setUser({ displayName: "Partner" });

    setStats({
      warehouses: 3,
      products: 128,
      activeShipments: 14,
      pendingReceipts: 6,
      delivered: 89,
    });

    setLoading(false);
  }, []);

  return (
    <div className="space-y-8 p-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-black">
            Overview
          </h2>
          <p className="mt-1 font-medium text-slate-500">
            Welcome back, {user?.displayName || "Partner"}
          </p>
        </div>

        <div className="flex items-center space-x-2 rounded-full border border-slate-100 bg-white px-4 py-2 shadow-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
            System Online
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#FFAD02]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative col-span-1 overflow-hidden rounded-3xl border-none bg-[#FFAD02] shadow-xl shadow-orange-200/50 md:col-span-2">
            <CardContent className="flex h-full min-h-55 flex-col justify-between p-8">
              <div className="z-10 flex items-start justify-between">
                <div className="rounded-2xl bg-black/10 p-3 backdrop-blur-sm">
                  <Truck className="h-8 w-8 text-black" />
                </div>
                <span className="rounded-full bg-black/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-black">
                  Total Active
                </span>
              </div>

              <div className="z-10">
                <h3 className="mb-1 text-6xl font-black tracking-tighter text-black">
                  {stats.activeShipments}
                </h3>
                <p className="text-lg font-bold text-black/70">
                  Shipments In Transit
                </p>
              </div>

              <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-white/10 blur-3xl transition-transform duration-500 group-hover:scale-110" />
            </CardContent>
          </Card>

          <Card className="col-span-1 overflow-hidden rounded-3xl border-none bg-black shadow-xl shadow-slate-400/20">
            <CardContent className="flex h-full min-h-55 flex-col justify-between p-8">
              <div className="flex justify-between items-start">
                <div className="rounded-2xl bg-white/10 p-3">
                  <CheckCircle2 className="h-6 w-6 text-[#FFAD02]" />
                </div>
              </div>
              <div>
                <h3 className="mb-1 text-5xl font-black tracking-tighter text-white">
                  {stats.delivered}
                </h3>
                <p className="font-bold text-slate-400">Delivered</p>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 overflow-hidden rounded-3xl border-none bg-white shadow-xl shadow-slate-200/50">
            <CardContent className="flex h-full min-h-55 flex-col justify-between p-8">
              <div className="flex justify-between items-start">
                <div className="rounded-2xl bg-slate-100 p-3">
                  <Clock className="h-6 w-6 text-slate-900" />
                </div>
              </div>
              <div>
                <h3 className="mb-1 text-5xl font-black tracking-tighter text-slate-900">
                  {stats.pendingReceipts}
                </h3>
                <p className="font-bold text-slate-500">Pending</p>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 rounded-3xl border-none bg-white shadow-lg shadow-slate-100">
            <CardContent className="flex items-center space-x-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                <Warehouse className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Warehouses
                </p>
                <p className="text-2xl font-black text-slate-900">
                  {stats.warehouses}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 rounded-3xl border-none bg-white shadow-lg shadow-slate-100">
            <CardContent className="flex items-center space-x-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Products
                </p>
                <p className="text-2xl font-black text-slate-900">
                  {stats.products}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 overflow-hidden rounded-3xl border-none bg-white shadow-lg shadow-slate-100 md:col-span-2">
            <CardContent className="p-0">
              <div className="grid h-full grid-cols-2 divide-x divide-slate-100">
                <Link
                  href="/shipments"
                  className="group flex cursor-pointer flex-col items-center justify-center p-6 transition-colors hover:bg-slate-50"
                >
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#FFAD02] transition-transform group-hover:scale-110">
                    <Truck className="h-6 w-6 text-black" />
                  </div>
                  <span className="font-bold text-slate-900">New Shipment</span>
                </Link>

                <Link
                  href="/products"
                  className="group flex cursor-pointer flex-col items-center justify-center p-6 transition-colors hover:bg-slate-50"
                >
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-110">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <span className="font-bold text-slate-900">Add Product</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
