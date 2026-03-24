"use client";

import { useState, useEffect } from "react";
import { Button, Input, Card, CardContent } from "@/components/atoms";
import { User, Truck, Phone, Star, ShieldCheck } from "lucide-react";

const mockDrivers: any[] = [
  {
    id: "drv_001",
    name: "Bat-Erdene",
    licensePlate: "UBA-1024",
    contactNumber: "+976 99112233",
    status: "available",
    ownerId: "mock-owner",
  },
  {
    id: "drv_002",
    name: "Temuulen",
    licensePlate: "UBC-7788",
    contactNumber: "+976 88114455",
    status: "busy",
    ownerId: "mock-owner",
  },
  {
    id: "drv_003",
    name: "Munkhbayar",
    licensePlate: "UBD-4512",
    contactNumber: "+976 77119900",
    status: "offline",
    ownerId: "mock-owner",
  },
];

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newDriver, setNewDriver] = useState({
    name: "",
    licensePlate: "",
    contactNumber: "",
    status: "available" as any["status"],
  });

  useEffect(() => {
    const loadDrivers = async () => {
      setLoading(true);

      // fake loading, дараа нь API-р солино
      await new Promise((resolve) => setTimeout(resolve, 400));

      setDrivers(mockDrivers);
      setLoading(false);
    };

    loadDrivers();
  }, []);

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const createdDriver: any = {
        id: `drv_${Date.now()}`,
        name: newDriver.name,
        licensePlate: newDriver.licensePlate,
        contactNumber: newDriver.contactNumber,
        status: newDriver.status,
        ownerId: "mock-owner",
      };

      setDrivers((prev) => [createdDriver, ...prev]);

      setNewDriver({
        name: "",
        licensePlate: "",
        contactNumber: "",
        status: "available",
      });

      setIsAdding(false);
    } catch (error) {
      console.error("Error adding driver:", error);
    }
  };

  return (
    <div className="space-y-8 p-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-slate-900">
            Drivers
          </h2>
          <p className="mt-1 font-medium text-slate-500">
            Manage your fleet team
          </p>
        </div>

        <Button
          onClick={() => setIsAdding(!isAdding)}
          className="rounded-full bg-black px-6 py-6 text-white shadow-lg shadow-black/20 transition-all hover:scale-105 hover:bg-slate-800"
        >
          <User className="mr-2 h-5 w-5" />
          <span className="font-bold">Add Driver</span>
        </Button>
      </div>

      {isAdding && (
        <Card className="animate-in slide-in-from-top-4 fade-in overflow-hidden rounded-3xl border-none shadow-2xl shadow-slate-200 duration-300">
          <div className="bg-black p-6">
            <h3 className="text-xl font-black text-white">
              Register New Driver
            </h3>
            <p className="text-sm font-medium text-white/70">
              Enter driver details below
            </p>
          </div>

          <CardContent className="p-8">
            <form onSubmit={handleAddDriver} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Full Name
                  </label>
                  <Input
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-medium focus:border-black focus:ring-black"
                    placeholder="e.g. John Doe"
                    value={newDriver.name}
                    onChange={(e) =>
                      setNewDriver({ ...newDriver, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    License Plate
                  </label>
                  <Input
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-medium focus:border-black focus:ring-black"
                    placeholder="e.g. ABC-1234"
                    value={newDriver.licensePlate}
                    onChange={(e) =>
                      setNewDriver({
                        ...newDriver,
                        licensePlate: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Phone Number
                  </label>
                  <Input
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-medium focus:border-black focus:ring-black"
                    placeholder="e.g. +1 234 567 8900"
                    value={newDriver.contactNumber}
                    onChange={(e) =>
                      setNewDriver({
                        ...newDriver,
                        contactNumber: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Initial Status
                  </label>
                  <select
                    className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    value={newDriver.status}
                    onChange={(e) =>
                      setNewDriver({
                        ...newDriver,
                        status: e.target.value as any["status"],
                      })
                    }
                  >
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="offline">Offline</option>
                  </select>
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
                  Register Driver
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
        ) : drivers.length === 0 ? (
          <div className="col-span-full rounded-3xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
              <User className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              No drivers found
            </h3>
            <p className="mt-1 text-slate-500">
              Add your first driver to the fleet.
            </p>
          </div>
        ) : (
          drivers.map((driver) => (
            <div
              key={driver.id}
              className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/80"
            >
              <div
                className={`absolute top-6 right-6 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                  driver.status === "available"
                    ? "bg-green-100 text-green-700"
                    : driver.status === "busy"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                <div
                  className={`h-2 w-2 rounded-full ${
                    driver.status === "available"
                      ? "animate-pulse bg-green-500"
                      : driver.status === "busy"
                        ? "bg-orange-500"
                        : "bg-slate-400"
                  }`}
                ></div>
                {driver.status}
              </div>

              <div className="flex flex-col items-center pb-6 pt-4 text-center">
                <div className="relative mb-4">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-slate-100 shadow-lg">
                    <User className="h-10 w-10 text-slate-400" />
                  </div>
                  <div className="absolute right-0 bottom-0 rounded-full border-2 border-white bg-black p-1.5 text-white">
                    <ShieldCheck className="h-3 w-3" />
                  </div>
                </div>

                <h3 className="text-xl font-black text-slate-900">
                  {driver.name}
                </h3>
                <p className="mt-1 text-sm font-bold uppercase tracking-wide text-slate-400">
                  Driver ID: #{driver.id.slice(0, 6)}
                </p>

                <div className="mt-3 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="h-4 w-4 fill-[#FFAD02] text-[#FFAD02]"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-white p-2 shadow-sm">
                      <Truck className="h-4 w-4 text-slate-900" />
                    </div>
                    <span className="text-sm font-bold text-slate-600">
                      License
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">
                    {driver.licensePlate}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-white p-2 shadow-sm">
                      <Phone className="h-4 w-4 text-slate-900" />
                    </div>
                    <span className="text-sm font-bold text-slate-600">
                      Phone
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">
                    {driver.contactNumber}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-10 rounded-xl border-slate-200 font-bold hover:bg-slate-50 hover:text-slate-900"
                >
                  Profile
                </Button>
                <Button className="h-10 rounded-xl bg-black font-bold text-white shadow-lg shadow-black/10 hover:bg-slate-800">
                  Contact
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
