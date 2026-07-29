"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getContractArchive } from "./api";
import type {
  ArchivedContract,
  ArchiveStatusFilter,
} from "./types";
import {
  getAvailableArchiveFields,
  matchesArchiveField,
} from "./archive-fields";
import { daysUntil } from "./contract-utils";

export function useContractArchive() {
  const [contracts, setContracts] = useState<ArchivedContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ArchiveStatusFilter>("ALL");
  const [fieldKey, setFieldKey] = useState("");
  const [fieldValue, setFieldValue] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await getContractArchive();
      setContracts(payload.submissions ?? []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Гэрээний архив авахад алдаа гарлаа",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const availableFields = useMemo(
    () => getAvailableArchiveFields(contracts),
    [contracts],
  );

  const selectedField =
    availableFields.find((field) => field.key === fieldKey) ?? null;

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("mn");
    return contracts.filter((contract) => {
      const days = daysUntil(contract.expiresAt);
      const matchesSearch =
        !query ||
        [
          contract.contractName,
          contract.contractNumber,
          contract.org,
          contract.register,
          contract.phone,
          contract.email,
          ...contract.customFields.map((field) => `${field.label} ${field.value}`),
        ].some((value) => value?.toLocaleLowerCase("mn").includes(query));
      const matchesStatus =
        status === "ALL" ||
        (status === "EXPIRING"
          ? days !== null && days >= 0 && days <= 30
          : status === "EXPIRED"
            ? days !== null && days < 0
            : contract.status === status);
      const matchesField = matchesArchiveField({
        contract,
        field: selectedField,
        value: fieldValue,
        dateFrom,
        dateTo,
      });
      return matchesSearch && matchesStatus && matchesField;
    });
  }, [
    contracts,
    search,
    status,
    selectedField,
    fieldValue,
    dateFrom,
    dateTo,
  ]);

  const stats = useMemo(
    () => ({
      all: contracts.length,
      signed: contracts.filter((item) => item.status === "SIGNED").length,
      pending: contracts.filter((item) => item.status === "PENDING").length,
      expiring: contracts.filter((item) => {
        const days = daysUntil(item.expiresAt);
        return days !== null && days >= 0 && days <= 30;
      }).length,
      expired: contracts.filter((item) => {
        const days = daysUntil(item.expiresAt);
        return days !== null && days < 0;
      }).length,
    }),
    [contracts],
  );

  return {
    contracts,
    filtered,
    stats,
    loading,
    error,
    search,
    status,
    availableFields,
    selectedField,
    fieldKey,
    fieldValue,
    dateFrom,
    dateTo,
    setSearch,
    setStatus,
    setFieldKey: (key: string) => {
      setFieldKey(key);
      setFieldValue("");
      setDateFrom("");
      setDateTo("");
    },
    setFieldValue,
    setDateFrom,
    setDateTo,
    clearFieldFilter: () => {
      setFieldKey("");
      setFieldValue("");
      setDateFrom("");
      setDateTo("");
    },
    refresh,
  };
}
