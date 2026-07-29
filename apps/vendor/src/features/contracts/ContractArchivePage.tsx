"use client";

import { useState } from "react";
import { Archive, RefreshCw, Search, Upload } from "lucide-react";
import { ContractArchiveSummary } from "./ContractArchiveSummary";
import { ContractArchiveTable } from "./ContractArchiveTable";
import { ContractDetailModal } from "./ContractDetailModal";
import { ContractFieldFilter } from "./ContractFieldFilter";
import { RegisterContractModal } from "./RegisterContractModal";
import { useContractArchive } from "./use-contract-archive";
import type { ArchivedContract } from "./types";

export function ContractArchivePage() {
  const archive = useContractArchive();
  const [selected, setSelected] = useState<ArchivedContract | null>(null);
  const [registering, setRegistering] = useState(false);

  return (
    <div className="space-y-4">
      {selected && <ContractDetailModal contract={selected} onClose={() => setSelected(null)} />}
      {registering && (
        <RegisterContractModal
          onClose={() => setRegistering(false)}
          onSuccess={archive.refresh}
        />
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 px-4 py-4 text-white shadow-lg sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15">
              <Archive className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black tracking-tight sm:text-2xl">Гэрээний архив</h1>
                <span className="rounded-full bg-blue-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300 ring-1 ring-inset ring-blue-300/15">
                  Contract archive
                </span>
              </div>
              <p className="mt-1 max-w-3xl truncate text-xs font-medium text-slate-300 sm:text-sm">
                Байгууллагын гэрээний мэдээлэл, эх файл, харилцагч болон дуусах хугацааг нэг дор бүртгэж хянана.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => void archive.refresh()} aria-label="Архив шинэчлэх" title="Шинэчлэх" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-slate-200 transition hover:bg-white/15 hover:text-white">
              <RefreshCw className={`h-4 w-4 ${archive.loading ? "animate-spin" : ""}`} />
            </button>
            <button type="button" onClick={() => setRegistering(true)} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-white px-3.5 text-xs font-black text-slate-950 shadow-sm transition hover:bg-blue-50 sm:text-sm">
              <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Скан гэрээ</span> бүртгэх
            </button>
          </div>
        </div>
      </section>

      {archive.error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {archive.error}
        </div>
      )}

      <ContractArchiveSummary stats={archive.stats} active={archive.status} onChange={archive.setStatus} />

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <label className="relative block">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <span className="sr-only">Гэрээ хайх</span>
          <input
            value={archive.search}
            onChange={(event) => archive.setSearch(event.target.value)}
            placeholder="Гэрээний нэр, дугаар, байгууллага, регистр, утас, и-мэйлээр хайх..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
          />
        </label>
        <ContractFieldFilter
          fields={archive.availableFields}
          selected={archive.selectedField}
          fieldKey={archive.fieldKey}
          value={archive.fieldValue}
          dateFrom={archive.dateFrom}
          dateTo={archive.dateTo}
          onFieldChange={archive.setFieldKey}
          onValueChange={archive.setFieldValue}
          onDateFromChange={archive.setDateFrom}
          onDateToChange={archive.setDateTo}
          onClear={archive.clearFieldFilter}
        />
      </section>

      <ContractArchiveTable contracts={archive.filtered} loading={archive.loading} onSelect={setSelected} />
    </div>
  );
}
