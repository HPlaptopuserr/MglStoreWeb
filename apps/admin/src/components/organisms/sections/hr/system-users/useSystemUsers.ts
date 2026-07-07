"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EMPTY_USERS_SUMMARY, ITEMS_PER_PAGE } from "./constants";
import { fetchSystemUsers } from "./system-users.api";
import type {
  SummaryFilter,
  SystemUser,
  UsersPrimeFilter,
  UsersStatusFilter,
  UsersSummary,
} from "./types";

export function useSystemUsers() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<UsersSummary>(EMPTY_USERS_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<UsersStatusFilter>("");
  const [primeFilter, setPrimeFilter] = useState<UsersPrimeFilter>("");
  const [page, setPage] = useState(1);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await fetchSystemUsers({
        page,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch,
        role: roleFilter,
        status: statusFilter,
        prime: primeFilter,
      });

      setUsers(payload.items);
      setTotalUsers(payload.total);
      setTotalPages(payload.totalPages);
      setSummary(payload.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, primeFilter, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  const currentPage = Math.min(page, totalPages);
  const hasActiveFilters = Boolean(
    search || roleFilter || statusFilter || primeFilter,
  );

  const applySummaryFilter = useCallback((filter: SummaryFilter) => {
    if (filter === "all") {
      setPage(1);
      setRoleFilter("");
      setStatusFilter("");
      setPrimeFilter("");
      return;
    }

    if (filter === "active") {
      setPage(1);
      setRoleFilter("");
      setPrimeFilter("");
      setStatusFilter((current) => (current === "active" ? "" : "active"));
      return;
    }

    if (filter === "prime") {
      setPage(1);
      setRoleFilter("");
      setStatusFilter("");
      setPrimeFilter((current) => (current === "prime" ? "" : "prime"));
      return;
    }

    setStatusFilter("");
    setPrimeFilter("");
    setPage(1);
    setRoleFilter((current) => {
      const role = filter.replace("role:", "");
      return current === role ? "" : role;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setRoleFilter("");
    setStatusFilter("");
    setPrimeFilter("");
    setPage(1);
  }, []);

  return useMemo(
    () => ({
      users,
      totalUsers,
      totalPages,
      currentPage,
      summary,
      loading,
      error,
      search,
      roleFilter,
      statusFilter,
      primeFilter,
      hasActiveFilters,
      setSearch,
      setRoleFilter,
      setStatusFilter,
      setPrimeFilter,
      setPage,
      loadUsers,
      applySummaryFilter,
      clearFilters,
    }),
    [
      users,
      totalUsers,
      totalPages,
      currentPage,
      summary,
      loading,
      error,
      search,
      roleFilter,
      statusFilter,
      primeFilter,
      hasActiveFilters,
      loadUsers,
      applySummaryFilter,
      clearFilters,
    ],
  );
}
