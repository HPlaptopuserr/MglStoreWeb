"use client";

import { useState } from "react";
import { Loader2, RefreshCw, UserPlus, Users, XCircle } from "lucide-react";
import { useAdminAuth } from "@/lib/admin-auth";
import { CreateAdminModal } from "./system-users/CreateAdminModal";
import { useSystemUsers } from "./system-users/useSystemUsers";
import { UserCard } from "./system-users/UserCard";
import { UsersFilters } from "./system-users/UsersFilters";
import { UsersPagination } from "./system-users/UsersPagination";
import { UsersSummaryCards } from "./system-users/UsersSummaryCards";
import type { UsersStatusFilter } from "./system-users/types";

export function SystemUsersSection() {
  const { hasAnyPermission, isFullAdmin } = useAdminAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const {
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
  } = useSystemUsers();

  const canManageAdminStaff =
    isFullAdmin || hasAnyPermission("MANAGE_ADMIN_STAFF");

  const handleSearchChange = (value: string) => {
    setPage(1);
    setSearch(value);
  };

  const handleRoleChange = (value: string) => {
    setPage(1);
    setRoleFilter(value);
    setPrimeFilter("");
  };

  const handleStatusChange = (value: UsersStatusFilter) => {
    setPage(1);
    setStatusFilter(value);
    setPrimeFilter("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
            <Users className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Системийн хэрэглэгчид
            </h2>
            <p className="text-xs text-slate-400">
              Бүх хэрэглэгчдийн мэдээлэл, төрөл, статус
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canManageAdminStaff && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Шинэ админ
            </button>
          )}
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Шинэчлэх
          </button>
        </div>
      </div>

      <CreateAdminModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={loadUsers}
      />

      <UsersSummaryCards
        summary={summary}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        primeFilter={primeFilter}
        onApplyFilter={applySummaryFilter}
      />

      <UsersFilters
        search={search}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        totalUsers={totalUsers}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={handleSearchChange}
        onRoleChange={handleRoleChange}
        onStatusChange={handleStatusChange}
        onClearFilters={clearFilters}
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Ачаалж байна...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
          <XCircle className="mx-auto mb-2 h-8 w-8 text-rose-400" />
          <p className="text-sm font-medium text-rose-600">{error}</p>
          <button
            type="button"
            onClick={loadUsers}
            className="mt-3 text-xs font-semibold text-rose-600 hover:underline"
          >
            Дахин оролдох
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            {hasActiveFilters
              ? "Хайлтад тохирох хэрэглэгч олдсонгүй"
              : "Хэрэглэгч бүртгэгдээгүй"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {users.map((user) => (
              <UserCard key={user.id} user={user} onChanged={loadUsers} />
            ))}
          </div>

          <UsersPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            onExactPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
