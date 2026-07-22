"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API, adminFetch } from "@/lib/api";
import {
  emptyWarehouseForm,
  type ManagedWarehouse,
  type PartnerApiEnvelope,
  type PartnerApiItem,
  type WarehouseFormValues,
  type WarehouseOrganization,
} from "./types";

type ModalKind = "create" | "edit" | "assign" | "delete" | null;

function getStoredAdminId(): string | undefined {
  try {
    const parsed = JSON.parse(localStorage.getItem("admin_user") || "{}") as {
      id?: unknown;
    };
    return typeof parsed.id === "string" ? parsed.id : undefined;
  } catch {
    return undefined;
  }
}

export function useWarehouseManagement() {
  const [warehouses, setWarehouses] = useState<ManagedWarehouse[]>([]);
  const [organizations, setOrganizations] = useState<WarehouseOrganization[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [modal, setModal] = useState<ModalKind>(null);
  const [selectedWarehouse, setSelectedWarehouse] =
    useState<ManagedWarehouse | null>(null);
  const [form, setForm] = useState<WarehouseFormValues>(emptyWarehouseForm);
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [warehouseResponse, partnerResponse] = await Promise.all([
        adminFetch(`${API}/warehouses`),
        adminFetch(`${API}/partners?limit=10000`),
      ]);
      if (warehouseResponse.ok) {
        const payload: unknown = await warehouseResponse.json();
        const items = Array.isArray(payload)
          ? (payload as ManagedWarehouse[])
          : [];
        setWarehouses(
          items.filter(
            (item) =>
              item.type !== "VENDOR_INTERNAL" &&
              !item.name.trim().endsWith("- Үндсэн агуулах"),
          ),
        );
      }
      if (partnerResponse.ok) {
        const payload: unknown = await partnerResponse.json();
        const items: PartnerApiItem[] = Array.isArray(payload)
          ? (payload as PartnerApiItem[])
          : ((payload as PartnerApiEnvelope).data ??
            (payload as PartnerApiEnvelope).partners ??
            []);
        setOrganizations(
          items.map(({ id, name, slug }) => ({ id, name, slug })),
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const closeModal = () => {
    setModal(null);
    setSelectedWarehouse(null);
    setForm(emptyWarehouseForm);
    setSelectedOrgIds([]);
  };
  const openCreate = () => {
    setForm(emptyWarehouseForm);
    setModal("create");
  };
  const openEdit = (warehouse: ManagedWarehouse) => {
    setSelectedWarehouse(warehouse);
    setForm({
      name: warehouse.name,
      address: warehouse.address,
      city: warehouse.city,
      district: warehouse.district,
      phone: warehouse.phone ?? "",
    });
    setModal("edit");
  };
  const openAssign = (warehouse: ManagedWarehouse) => {
    setSelectedWarehouse(warehouse);
    setSelectedOrgIds(warehouse.organizations.map(({ id }) => id));
    setModal("assign");
  };
  const openDelete = (warehouse: ManagedWarehouse) => {
    setSelectedWarehouse(warehouse);
    setModal("delete");
  };

  const submit = async (action: () => Promise<Response>, message: string) => {
    setIsSubmitting(true);
    try {
      const response = await action();
      if (!response.ok) throw new Error(message);
      closeModal();
      await load();
    } catch (error) {
      console.error(message, error);
      window.alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };
  const createWarehouse = () =>
    submit(
      () =>
        adminFetch(`${API}/warehouses`, {
          method: "POST",
          body: JSON.stringify({ ...form, createdById: getStoredAdminId() }),
        }),
      "Агуулах үүсгэхэд алдаа гарлаа",
    );
  const updateWarehouse = () =>
    selectedWarehouse &&
    submit(
      () =>
        adminFetch(`${API}/warehouses/${selectedWarehouse.id}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        }),
      "Агуулах засахад алдаа гарлаа",
    );
  const assignWarehouse = () =>
    selectedWarehouse &&
    submit(
      () =>
        adminFetch(`${API}/warehouses/${selectedWarehouse.id}/assign`, {
          method: "POST",
          body: JSON.stringify({
            organizationIds: selectedOrgIds,
            assignedById: getStoredAdminId(),
          }),
        }),
      "Агуулах хуваарилахад алдаа гарлаа",
    );
  const deleteWarehouse = () =>
    selectedWarehouse &&
    submit(
      () =>
        adminFetch(`${API}/warehouses/${selectedWarehouse.id}`, {
          method: "DELETE",
        }),
      "Агуулах устгахад алдаа гарлаа",
    );

  const filteredWarehouses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return query
      ? warehouses.filter((item) =>
          [item.name, item.address, item.city].some((value) =>
            value.toLowerCase().includes(query),
          ),
        )
      : warehouses;
  }, [searchTerm, warehouses]);
  return {
    warehouses,
    organizations,
    filteredWarehouses,
    isLoading,
    isSubmitting,
    searchTerm,
    setSearchTerm,
    modal,
    selectedWarehouse,
    form,
    setForm,
    selectedOrgIds,
    setSelectedOrgIds,
    openCreate,
    openEdit,
    openAssign,
    openDelete,
    closeModal,
    createWarehouse,
    updateWarehouse,
    assignWarehouse,
    deleteWarehouse,
  };
}
