"use client";

import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Truck,
  ArrowRight,
  CheckCircle,
  Clock,
  User,
  MapPin,
  Package,
  X,
  CreditCard,
  Building,
} from "lucide-react";

type ShipmentStatus = "pending" | "in-transit" | "delivered" | "received";

type Warehouse = {
  id: string;
  name: string;
  location: string;
  capacity: number;
  ownerId: string;
};

type Product = {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  stock?: number;
  ownerId: string;
};

type Driver = {
  id: string;
  name: string;
  licensePlate: string;
  contactNumber: string;
  status: "available" | "busy" | "offline";
  ownerId: string;
};

type Shipment = {
  id: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  productId: string;
  driverId?: string;
  quantity: number;
  status: ShipmentStatus;
  ownerId: string;
  companyName?: string;
  destinationAddress?: string;
  paymentMethod?: string;
  orderedAt?: string;
  shippedAt: string;
  receivedAt?: string;
};

const mockWarehouses: Warehouse[] = [
  {
    id: "wh_001",
    name: "Central Hub",
    location: "Ulaanbaatar",
    capacity: 10000,
    ownerId: "mock-owner",
  },
  {
    id: "wh_002",
    name: "East Depot",
    location: "Bayanzurkh",
    capacity: 6000,
    ownerId: "mock-owner",
  },
  {
    id: "wh_003",
    name: "Darkhan Storage",
    location: "Darkhan",
    capacity: 4200,
    ownerId: "mock-owner",
  },
];

const mockProducts: Product[] = [
  { id: "prd_001", name: "Rice 25kg", ownerId: "mock-owner" },
  { id: "prd_002", name: "Cooking Oil 5L", ownerId: "mock-owner" },
  { id: "prd_003", name: "Mineral Water Pack", ownerId: "mock-owner" },
];

const mockDrivers: Driver[] = [
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
    status: "available",
    ownerId: "mock-owner",
  },
];

const mockShipments: Shipment[] = [
  {
    id: "shp_001",
    sourceWarehouseId: "wh_001",
    destinationWarehouseId: "wh_002",
    productId: "prd_001",
    driverId: "drv_001",
    quantity: 120,
    status: "pending",
    ownerId: "mock-owner",
    companyName: "Tech Solutions LLC",
    destinationAddress: "Bayanzurkh District, Ulaanbaatar",
    paymentMethod: "Bank Transfer",
    orderedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    shippedAt: new Date().toISOString(),
  },
  {
    id: "shp_002",
    sourceWarehouseId: "wh_002",
    destinationWarehouseId: "wh_003",
    productId: "prd_002",
    driverId: "drv_002",
    quantity: 80,
    status: "in-transit",
    ownerId: "mock-owner",
    companyName: "Nomad Retail",
    destinationAddress: "Darkhan City Center",
    paymentMethod: "Credit Card",
    orderedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    shippedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: "shp_003",
    sourceWarehouseId: "wh_001",
    destinationWarehouseId: "wh_003",
    productId: "prd_003",
    quantity: 40,
    status: "delivered",
    ownerId: "mock-owner",
    companyName: "Fresh Market",
    destinationAddress: "Darkhan Main Road",
    paymentMethod: "Cash",
    orderedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    shippedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  },
  {
    id: "shp_004",
    sourceWarehouseId: "wh_003",
    destinationWarehouseId: "wh_001",
    productId: "prd_001",
    driverId: "drv_003",
    quantity: 60,
    status: "received",
    ownerId: "mock-owner",
    companyName: "Altan Trade",
    destinationAddress: "Central Warehouse Receiving Dock",
    paymentMethod: "PayPal",
    orderedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    shippedAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
];

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(
    null,
  );
  const [selectedDriverFilter, setSelectedDriverFilter] =
    useState<string>("all");

  const [newShipment, setNewShipment] = useState({
    sourceWarehouseId: "",
    destinationWarehouseId: "",
    productId: "",
    driverId: "",
    quantity: "",
    companyName: "",
    destinationAddress: "",
    paymentMethod: "",
    orderedAt: new Date().toISOString().slice(0, 16),
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 400));
      setWarehouses(mockWarehouses);
      setProducts(mockProducts);
      setDrivers(mockDrivers);
      setShipments(mockShipments);
      setLoading(false);
    };

    loadData();
  }, []);

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();

    const createdShipment: Shipment = {
      id: `shp_${Date.now()}`,
      sourceWarehouseId: newShipment.sourceWarehouseId,
      destinationWarehouseId: newShipment.destinationWarehouseId,
      productId: newShipment.productId,
      driverId: newShipment.driverId || undefined,
      quantity: Number(newShipment.quantity),
      status: "pending",
      ownerId: "mock-owner",
      companyName: newShipment.companyName,
      destinationAddress: newShipment.destinationAddress,
      paymentMethod: newShipment.paymentMethod,
      orderedAt: new Date(newShipment.orderedAt).toISOString(),
      shippedAt: new Date().toISOString(),
    };

    setShipments((prev) => [createdShipment, ...prev]);
    setNewShipment({
      sourceWarehouseId: "",
      destinationWarehouseId: "",
      productId: "",
      driverId: "",
      quantity: "",
      companyName: "",
      destinationAddress: "",
      paymentMethod: "",
      orderedAt: new Date().toISOString().slice(0, 16),
    });
    setIsAdding(false);
  };

  const handleUpdateStatus = (
    shipmentId: string,
    newStatus: Shipment["status"],
  ) => {
    setShipments((prev) =>
      prev.map((shipment) =>
        shipment.id === shipmentId
          ? {
              ...shipment,
              status: newStatus,
              shippedAt:
                newStatus === "in-transit" && !shipment.shippedAt
                  ? new Date().toISOString()
                  : shipment.shippedAt,
              receivedAt:
                newStatus === "received"
                  ? new Date().toISOString()
                  : shipment.receivedAt,
            }
          : shipment,
      ),
    );

    setSelectedShipment((prev) =>
      prev && prev.id === shipmentId
        ? {
            ...prev,
            status: newStatus,
            shippedAt:
              newStatus === "in-transit" && !prev.shippedAt
                ? new Date().toISOString()
                : prev.shippedAt,
            receivedAt:
              newStatus === "received"
                ? new Date().toISOString()
                : prev.receivedAt,
          }
        : prev,
    );
  };

  const handleUpdateDriver = (shipmentId: string, driverId: string) => {
    setShipments((prev) =>
      prev.map((shipment) =>
        shipment.id === shipmentId ? { ...shipment, driverId } : shipment,
      ),
    );

    setSelectedShipment((prev) =>
      prev && prev.id === shipmentId ? { ...prev, driverId } : prev,
    );
  };

  const filteredShipments = useMemo(() => {
    return shipments.filter((shipment) => {
      if (selectedDriverFilter === "all") return true;
      if (selectedDriverFilter === "unassigned") return !shipment.driverId;
      return shipment.driverId === selectedDriverFilter;
    });
  }, [shipments, selectedDriverFilter]);

  const getWarehouseName = (id: string) =>
    warehouses.find((w) => w.id === id)?.name || "Unknown Warehouse";

  const getProductName = (id: string) =>
    products.find((p) => p.id === id)?.name || "Unknown Product";

  const getDriverName = (id?: string) =>
    drivers.find((d) => d.id === id)?.name || "Unassigned";

  return (
    <div className="space-y-8 p-2">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-slate-900">
            Shipments
          </h2>
          <p className="mt-1 font-medium text-slate-500">
            Track and manage deliveries
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            className="h-12 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm focus:border-[#FFAD02] focus:outline-none focus:ring-1 focus:ring-[#FFAD02]"
            value={selectedDriverFilter}
            onChange={(e) => setSelectedDriverFilter(e.target.value)}
          >
            <option value="all">All Drivers</option>
            <option value="unassigned">Unassigned</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <Button
            onClick={() => setIsAdding(!isAdding)}
            className="rounded-full bg-black px-6 py-6 text-white shadow-lg shadow-black/20 transition-all hover:scale-105 hover:bg-slate-800"
          >
            <Truck className="mr-2 h-5 w-5" />
            <span className="font-bold">New Shipment</span>
          </Button>
        </div>
      </div>

      {isAdding && (
        <Card className="animate-in slide-in-from-top-4 fade-in overflow-hidden rounded-3xl border-none shadow-2xl shadow-slate-200 duration-300">
          <div className="bg-[#FFAD02] p-6">
            <h3 className="text-xl font-black text-black">
              Create New Shipment
            </h3>
            <p className="text-sm font-medium text-black/70">
              Fill in the details below
            </p>
          </div>

          <CardContent className="p-8">
            <form onSubmit={handleCreateShipment} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Company Name
                  </label>
                  <Input
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-medium focus:border-[#FFAD02] focus:ring-[#FFAD02]"
                    placeholder="e.g. Tech Solutions Inc."
                    value={newShipment.companyName}
                    onChange={(e) =>
                      setNewShipment({
                        ...newShipment,
                        companyName: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Destination Address
                  </label>
                  <Input
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-medium focus:border-[#FFAD02] focus:ring-[#FFAD02]"
                    placeholder="e.g. 123 Tech Blvd, Los Angeles, CA"
                    value={newShipment.destinationAddress}
                    onChange={(e) =>
                      setNewShipment({
                        ...newShipment,
                        destinationAddress: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Payment Method
                  </label>
                  <select
                    className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium focus:border-[#FFAD02] focus:outline-none focus:ring-1 focus:ring-[#FFAD02]"
                    value={newShipment.paymentMethod}
                    onChange={(e) =>
                      setNewShipment({
                        ...newShipment,
                        paymentMethod: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select Payment Method</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Time of Order
                  </label>
                  <Input
                    type="datetime-local"
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-medium focus:border-[#FFAD02] focus:ring-[#FFAD02]"
                    value={newShipment.orderedAt}
                    onChange={(e) =>
                      setNewShipment({
                        ...newShipment,
                        orderedAt: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Source
                  </label>
                  <select
                    className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium focus:border-[#FFAD02] focus:outline-none focus:ring-1 focus:ring-[#FFAD02]"
                    value={newShipment.sourceWarehouseId}
                    onChange={(e) =>
                      setNewShipment({
                        ...newShipment,
                        sourceWarehouseId: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select Source Warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Destination
                  </label>
                  <select
                    className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium focus:border-[#FFAD02] focus:outline-none focus:ring-1 focus:ring-[#FFAD02]"
                    value={newShipment.destinationWarehouseId}
                    onChange={(e) =>
                      setNewShipment({
                        ...newShipment,
                        destinationWarehouseId: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select Destination Warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Product
                  </label>
                  <select
                    className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium focus:border-[#FFAD02] focus:outline-none focus:ring-1 focus:ring-[#FFAD02]"
                    value={newShipment.productId}
                    onChange={(e) =>
                      setNewShipment({
                        ...newShipment,
                        productId: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-medium focus:border-[#FFAD02] focus:ring-[#FFAD02]"
                    placeholder="0"
                    value={newShipment.quantity}
                    onChange={(e) =>
                      setNewShipment({
                        ...newShipment,
                        quantity: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Assign Driver
                  </label>
                  <select
                    className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium focus:border-[#FFAD02] focus:outline-none focus:ring-1 focus:ring-[#FFAD02]"
                    value={newShipment.driverId}
                    onChange={(e) =>
                      setNewShipment({
                        ...newShipment,
                        driverId: e.target.value,
                      })
                    }
                  >
                    <option value="">Select Driver (Optional)</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.status})
                      </option>
                    ))}
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
                  className="h-12 rounded-xl bg-black px-8 font-bold text-white shadow-lg shadow-black/20 hover:bg-slate-800"
                >
                  Create Shipment
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-[#FFAD02]"></div>
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
              <Truck className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              No shipments found
            </h3>
            <p className="mt-1 text-slate-500">
              Try adjusting your filters or create a new shipment.
            </p>
          </div>
        ) : (
          filteredShipments.map((shipment) => (
            <div
              key={shipment.id}
              className="group rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/80"
            >
              <div className="flex flex-col gap-6 lg:flex-row">
                <div className="flex min-w-[200px] items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 transition-colors duration-300 group-hover:bg-[#FFAD02]">
                    <Package className="h-7 w-7 text-slate-900" />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-2xl font-black text-slate-900">
                        {shipment.quantity}x
                      </span>
                      <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
                        {getProductName(shipment.productId)}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <div className="flex items-center gap-2">
                        <span>#{shipment.id.slice(0, 8)}</span>
                        <span>•</span>
                        <span>
                          {new Date(shipment.shippedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {shipment.companyName && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <User className="h-3 w-3" />
                          <span>{shipment.companyName}</span>
                        </div>
                      )}

                      {shipment.orderedAt && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Clock className="h-3 w-3" />
                          <span>
                            Ordered:{" "}
                            {new Date(shipment.orderedAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-center">
                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="mb-1 text-xs font-bold uppercase text-slate-400">
                        From
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-slate-300"></div>
                        <p className="font-bold text-slate-900">
                          {getWarehouseName(shipment.sourceWarehouseId)}
                        </p>
                      </div>
                    </div>

                    <ArrowRight className="text-slate-300" />

                    <div className="flex-1 text-right lg:text-left">
                      <p className="mb-1 text-xs font-bold uppercase text-slate-400">
                        To
                      </p>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-end gap-2 lg:justify-start">
                          <div className="h-2 w-2 rounded-full bg-[#FFAD02]"></div>
                          <p className="font-bold text-slate-900">
                            {getWarehouseName(shipment.destinationWarehouseId)}
                          </p>
                        </div>

                        {shipment.destinationAddress && (
                          <div className="flex items-center justify-end gap-1 text-xs font-medium text-slate-500 lg:justify-start">
                            <MapPin className="h-3 w-3" />
                            <span>{shipment.destinationAddress}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {shipment.paymentMethod && (
                      <div className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        Payment: {shipment.paymentMethod}
                      </div>
                    )}

                    <div className="flex-1">
                      {shipment.driverId ? (
                        <div className="w-full max-w-xs rounded-2xl border border-slate-100 bg-slate-50 p-3 transition-colors group-hover:border-[#FFAD02]/30">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-100 bg-white shadow-sm">
                              <User className="h-5 w-5 text-slate-400" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Assigned Driver
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-900">
                                  {getDriverName(shipment.driverId)}
                                </p>
                                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full max-w-xs rounded-2xl border border-red-100 bg-red-50 p-3 transition-colors group-hover:border-red-200">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-red-100 bg-white shadow-sm">
                              <User className="h-5 w-5 text-red-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                                No Driver
                              </p>
                              <select
                                className="mt-1 w-full cursor-pointer border-none bg-transparent p-0 text-sm font-bold text-slate-900 focus:outline-none"
                                onChange={(e) =>
                                  handleUpdateDriver(
                                    shipment.id,
                                    e.target.value,
                                  )
                                }
                                defaultValue=""
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="" disabled>
                                  Assign Driver...
                                </option>
                                {drivers
                                  .filter((d) => d.status === "available")
                                  .map((d) => (
                                    <option key={d.id} value={d.id}>
                                      {d.name}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex min-w-[180px] flex-col items-end justify-between gap-4">
                  <div
                    className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide ${
                      shipment.status === "delivered" ||
                      shipment.status === "received"
                        ? "bg-green-100 text-green-700"
                        : shipment.status === "in-transit"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {shipment.status.replace("-", " ")}
                  </div>

                  <div className="w-full">
                    {shipment.status === "pending" && (
                      <Button
                        onClick={() =>
                          handleUpdateStatus(shipment.id, "in-transit")
                        }
                        className="h-12 w-full rounded-xl bg-black font-bold text-white shadow-lg shadow-black/20 hover:bg-slate-800"
                      >
                        Start Transit
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}

                    {shipment.status === "in-transit" && (
                      <Button
                        onClick={() =>
                          handleUpdateStatus(shipment.id, "delivered")
                        }
                        className="h-12 w-full rounded-xl bg-[#FFAD02] font-bold text-black shadow-lg shadow-orange-500/20 hover:bg-amber-500"
                      >
                        Confirm Delivery
                        <CheckCircle className="ml-2 h-4 w-4" />
                      </Button>
                    )}

                    {shipment.status === "delivered" && (
                      <Button
                        onClick={() =>
                          handleUpdateStatus(shipment.id, "received")
                        }
                        className="h-12 w-full rounded-xl border-2 border-black bg-white font-bold text-black hover:bg-slate-50"
                      >
                        Receive Goods
                        <Package className="ml-2 h-4 w-4" />
                      </Button>
                    )}

                    {shipment.status === "received" && (
                      <div className="flex h-12 w-full items-center justify-center rounded-xl bg-green-50 font-bold text-green-600">
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Completed
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedShipment(shipment);
                      }}
                      className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedShipment && (
        <div
          className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm duration-200"
          onClick={() => setSelectedShipment(null)}
        >
          <div
            className="animate-in zoom-in-95 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b border-slate-100 bg-white/90 px-6 py-4 backdrop-blur">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-black text-slate-900">
                  Shipment Details
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                      selectedShipment.status === "delivered" ||
                      selectedShipment.status === "received"
                        ? "bg-green-100 text-green-700"
                        : selectedShipment.status === "in-transit"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {selectedShipment.status.replace("-", " ")}
                  </span>
                </h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  ID:{" "}
                  <span className="text-slate-900">{selectedShipment.id}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedShipment(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 transition-colors hover:bg-slate-200"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>

            <div className="space-y-8 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-50">
                  <Package className="h-8 w-8 text-[#FFAD02]" />
                </div>
                <div>
                  <h4 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Product
                  </h4>
                  <p className="text-lg font-black text-slate-900">
                    {getProductName(selectedShipment.productId)}
                  </p>
                  <div className="mt-2 flex gap-4">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-1">
                      <span className="text-xs font-bold text-slate-500">
                        Qty:
                      </span>
                      <span className="ml-2 font-black text-slate-900">
                        {selectedShipment.quantity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                <h4 className="mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Route
                </h4>
                <div className="relative space-y-6">
                  <div className="absolute bottom-6 left-[11px] top-6 w-0.5 bg-slate-200"></div>

                  <div className="relative z-10 flex gap-4">
                    <div className="mt-1 h-6 w-6 flex-shrink-0 rounded-full border-4 border-slate-300 bg-white shadow-sm"></div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {getWarehouseName(selectedShipment.sourceWarehouseId)}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        Source Warehouse
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 flex gap-4">
                    <div className="mt-1 h-6 w-6 flex-shrink-0 rounded-full border-4 border-[#FFAD02] bg-white shadow-sm"></div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {getWarehouseName(
                          selectedShipment.destinationWarehouseId,
                        )}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        Destination Warehouse
                      </p>

                      {selectedShipment.destinationAddress && (
                        <div className="mt-3 flex items-start gap-2 rounded-xl border border-slate-100 bg-white p-3 text-sm text-slate-700 shadow-sm">
                          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#FFAD02]" />
                          <span className="font-semibold">
                            {selectedShipment.destinationAddress}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Clock className="h-4 w-4" /> Timeline
                  </h4>

                  <div className="space-y-3">
                    {selectedShipment.orderedAt && (
                      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Ordered
                        </p>
                        <p className="text-sm font-bold text-slate-900">
                          {new Date(selectedShipment.orderedAt).toLocaleString(
                            [],
                            {
                              dateStyle: "medium",
                              timeStyle: "short",
                            },
                          )}
                        </p>
                      </div>
                    )}

                    {selectedShipment.shippedAt && (
                      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Shipped
                        </p>
                        <p className="text-sm font-bold text-slate-900">
                          {new Date(selectedShipment.shippedAt).toLocaleString(
                            [],
                            {
                              dateStyle: "medium",
                              timeStyle: "short",
                            },
                          )}
                        </p>
                      </div>
                    )}

                    {selectedShipment.receivedAt && (
                      <div className="rounded-2xl border border-green-100 bg-green-50 p-4 shadow-sm">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-green-600">
                          Received
                        </p>
                        <p className="text-sm font-bold text-green-900">
                          {new Date(selectedShipment.receivedAt).toLocaleString(
                            [],
                            {
                              dateStyle: "medium",
                              timeStyle: "short",
                            },
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <Building className="h-4 w-4" /> Customer
                    </h4>

                    <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      {selectedShipment.companyName ? (
                        <p className="font-bold text-slate-900">
                          {selectedShipment.companyName}
                        </p>
                      ) : (
                        <p className="text-sm italic text-slate-500">
                          No company specified
                        </p>
                      )}

                      {selectedShipment.paymentMethod && (
                        <div className="w-max rounded-lg border border-slate-100 bg-slate-50 p-2 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-slate-400" />
                            <span className="font-medium">
                              {selectedShipment.paymentMethod}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <Truck className="h-4 w-4" /> Driver
                    </h4>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      {selectedShipment.driverId ? (
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-slate-50">
                            <User className="h-5 w-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {getDriverName(selectedShipment.driverId)}
                            </p>
                            <p className="mt-0.5 text-[10px] font-bold uppercase text-slate-400">
                              Assigned
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-red-100 bg-red-50">
                            <User className="h-5 w-5 text-red-400" />
                          </div>
                          <p className="text-sm font-bold text-red-500">
                            No driver assigned
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
