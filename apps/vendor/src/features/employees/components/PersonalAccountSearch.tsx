"use client";

import { ArrowRight, Check, Search, UserRoundSearch, X } from "lucide-react";
import { usePersonalAccountSearch } from "../usePersonalAccountSearch";
import type { PersonalAccount } from "../store-employee.model";
import { EmployeeAlert, EmployeeAvatar } from "./EmployeePrimitives";

export function PersonalAccountSearch({
  organizationId,
  query,
  onQueryChange,
  selected,
  onSelect,
}: {
  organizationId: string;
  query: string;
  onQueryChange: (value: string) => void;
  selected: PersonalAccount | null;
  onSelect: (account: PersonalAccount) => void;
}) {
  const search = usePersonalAccountSearch(organizationId, query);
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="personal-account-search"
          className="mb-2 block text-sm font-semibold text-slate-800"
        >
          Хувийн бүртгэл хайх
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="personal-account-search"
            data-autofocus
            type="search"
            autoComplete="off"
            maxLength={100}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Нэр, утас эсвэл имэйлээр хайх"
            aria-describedby="personal-search-help"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              aria-label="Хэрэглэгчийн хайлт цэвэрлэх"
              onClick={() => onQueryChange("")}
              className="absolute right-1 top-1 flex size-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 focus-visible:outline-2"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <p
          id="personal-search-help"
          className="mt-2 text-xs leading-5 text-slate-500"
        >
          MGL Store-д бүртгэлтэй хүнийг хайна. Хамгийн багадаа 2 тэмдэгт оруулна
          уу.
        </p>
      </div>
      <div aria-live="polite" aria-busy={search.status === "loading"}>
        {search.status === "idle" && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-9 text-center">
            <UserRoundSearch
              className="mx-auto mb-3 size-8 text-slate-400"
              aria-hidden="true"
            />
            <p className="text-sm font-semibold text-slate-700">
              Багтаа нэмэх хүнээ олоорой
            </p>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">
              Утас эсвэл имэйлээр хайвал зөв хүнээ
              <br className="hidden sm:block" /> илүү хурдан олох боломжтой.
            </p>
          </div>
        )}
        {search.status === "loading" && (
          <div
            role="status"
            className="space-y-3 rounded-2xl border border-slate-100 p-4"
          >
            <span className="sr-only">Хувийн бүртгэл хайж байна</span>
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                aria-hidden="true"
                className="flex animate-pulse items-center gap-3 motion-reduce:animate-none"
              >
                <div className="size-11 rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-slate-100" />
                  <div className="h-3 w-2/3 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        )}
        {search.status === "error" && (
          <EmployeeAlert retry={search.retry}>{search.error}</EmployeeAlert>
        )}
        {search.status === "success" &&
          (search.accounts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 px-5 py-7 text-center">
              <Search
                className="mx-auto mb-3 size-7 text-slate-300"
                aria-hidden="true"
              />
              <p className="text-sm font-semibold text-slate-700">
                Тохирох хэрэглэгч олдсонгүй
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Утас, имэйлийг шалгаж дахин хайна уу. Хувийн бүртгэлгүй бол
                эхлээд MGL Store-д бүртгүүлсэн байх шаардлагатай.
              </p>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">
                {search.accounts.length === 10
                  ? "Эхний 10 үр дүн · Хайлтаа нарийвчилж болно"
                  : `${search.accounts.length} хэрэглэгч олдлоо`}
              </p>
              <ul
                className="max-h-72 space-y-2 overflow-y-auto rounded-xl"
                aria-label="Хайлтаар олдсон хувийн бүртгэлүүд"
              >
                {search.accounts.map((account) => {
                  const isSelected = selected?.id === account.id;
                  return (
                    <li key={account.id}>
                      <button
                        type="button"
                        disabled={
                          account.membership === "ACTIVE" ||
                          account.membership === "INACTIVE"
                        }
                        aria-pressed={isSelected}
                        onClick={() => onSelect(account)}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-65 ${isSelected ? "border-blue-500 bg-blue-50/60" : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"}`}
                      >
                        <EmployeeAvatar
                          name={account.fullName || account.email}
                          muted={
                            account.membership === "ACTIVE" ||
                            account.membership === "INACTIVE"
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">
                            {account.fullName || "Нэр бүртгээгүй"}
                          </span>
                          <span className="mt-0.5 block break-all text-xs leading-5 text-slate-500">
                            {account.email}
                          </span>
                          <span className="block text-xs leading-5 text-slate-500">
                            {account.phone || "Утас бүртгээгүй"}
                          </span>
                          {account.membership && (
                            <span className="mt-1 block text-xs font-medium text-slate-600">
                              {account.membership === "OTHER"
                                ? "Кассын ажилтнаар нэмэх боломжтой"
                                : account.membership === "ACTIVE"
                                  ? "Энэ дэлгүүрт бүртгэлтэй"
                                  : "Эрх түр хаалттай · Жагсаалтаас сэргээнэ үү"}
                            </span>
                          )}
                        </span>
                        {(account.membership === null ||
                          account.membership === "OTHER") &&
                          (isSelected ? (
                            <Check
                              className="size-5 shrink-0 text-blue-600"
                              aria-hidden="true"
                            />
                          ) : (
                            <ArrowRight
                              className="size-4 shrink-0 text-slate-400"
                              aria-hidden="true"
                            />
                          ))}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
      </div>
    </div>
  );
}
