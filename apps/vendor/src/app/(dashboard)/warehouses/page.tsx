"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Plus,
  MapPin,
  Box,
  Warehouse as WarehouseIcon,
  ArrowUpRight,
} from "lucide-react";

type Warehouse = {
  id: string;
  name: string;
  location: string;
  capacity: number;
  ownerId: string;
};

const mockWarehouses: Warehouse[] = [
  {
    id: "wh_001",
    name: "Central Hub",
    location: "Ulaanbaatar, Bayanzurkh",
    capacity: 10000,
    ownerId: "mock-owner",
  },
  {
    id: "wh_002",
    name: "West Storage",
    location: "Ulaanbaatar, Songinokhairkhan",
    capacity: 6500,
    ownerId: "mock-owner",
  },
  {
    id: "wh_003",
    name: "Darkhan Depot",
    location: "Darkhan-Uul",
    capacity: 4200,
    ownerId: "mock-owner",
  },
];

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({
    name: "",
    location: "",
    capacity: "",
  });

  useEffect(() => {
    const loadWarehouses = async () => {
      setLoading(true);

      // fake loading
      await new Promise((resolve) => setTimeout(resolve, 400));

      setWarehouses(mockWarehouses);
      setLoading(false);
    };

    loadWarehouses();
  }, []);

  const handleAddWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const createdWarehouse: Warehouse = {
        id: `wh_${Date.now()}`,
        name: newWarehouse.name,
        location: newWarehouse.location,
        capacity: Number(newWarehouse.capacity),
        ownerId: "mock-owner",
      };

      setWarehouses((prev) => [createdWarehouse, ...prev]);
      setNewWarehouse({ name: "", location: "", capacity: "" });
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding warehouse:", error);
    }
  };

  return (
    <div className="space-y-8 p-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-slate-900">
            Warehouses
          </h2>
          <p className="mt-1 font-medium text-slate-500">
            Manage your storage locations
          </p>
        </div>

        <Button
          onClick={() => setIsAdding(!isAdding)}
          className="rounded-full bg-black px-6 py-6 text-white shadow-lg shadow-black/20 transition-all hover:scale-105 hover:bg-slate-800"
        >
          <Plus className="mr-2 h-5 w-5" />
          <span className="font-bold">Add Warehouse</span>
        </Button>
      </div>

      {isAdding && (
        <Card className="animate-in slide-in-from-top-4 fade-in overflow-hidden rounded-3xl border-none shadow-2xl shadow-slate-200 duration-300">
          <div className="bg-black p-6">
            <h3 className="text-xl font-black text-white">New Warehouse</h3>
            <p className="text-sm font-medium text-white/70">
              Enter warehouse details below
            </p>
          </div>

          <CardContent className="p-8">
            <form onSubmit={handleAddWarehouse} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Warehouse Name
                  </label>
                  <Input
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-medium focus:border-black focus:ring-black"
                    placeholder="e.g. Central Hub"
                    value={newWarehouse.name}
                    onChange={(e) =>
                      setNewWarehouse({
                        ...newWarehouse,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Location
                  </label>
                  <Input
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-medium focus:border-black focus:ring-black"
                    placeholder="e.g. New York, NY"
                    value={newWarehouse.location}
                    onChange={(e) =>
                      setNewWarehouse({
                        ...newWarehouse,
                        location: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Capacity
                  </label>
                  <Input
                    type="number"
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-medium focus:border-black focus:ring-black"
                    placeholder="e.g. 10000"
                    value={newWarehouse.capacity}
                    onChange={(e) =>
                      setNewWarehouse({
                        ...newWarehouse,
                        capacity: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsAdding(false)}
                  className="h-12 rounded-xl px-6 font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-12 rounded-xl bg-[#FFAD02] px-8 font-bold text-black shadow-lg shadow-orange-500/20 hover:bg-amber-500"
                >
                  Save Warehouse
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-black"></div>
          </div>
        ) : warehouses.length === 0 ? (
          <div className="col-span-full rounded-3xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
              <WarehouseIcon className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              No warehouses found
            </h3>
            <p className="mt-1 text-slate-500">
              Get started by adding a new warehouse.
            </p>
          </div>
        ) : (
          warehouses.map((warehouse) => (
            <div
              key={warehouse.id}
              className="group flex h-full flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/80"
            >
              <div className="mb-6 flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 transition-colors group-hover:bg-green-100">
                  <WarehouseIcon className="h-7 w-7 text-green-600" />
                </div>
                <div className="cursor-pointer rounded-full bg-slate-50 p-2 transition-colors hover:bg-slate-100">
                  <ArrowUpRight className="h-5 w-5 text-slate-400" />
                </div>
              </div>

              <h3 className="mb-1 text-xl font-black text-slate-900">
                {warehouse.name}
              </h3>

              <div className="mb-6 flex items-center text-sm font-medium text-slate-500">
                <MapPin className="mr-1 h-4 w-4 text-[#FFAD02]" />
                {warehouse.location}
              </div>

              <div className="mt-auto border-t border-slate-100 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Capacity
                    </p>
                    <p className="text-lg font-black text-slate-900">
                      {warehouse.capacity.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50">
                    <Box className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
