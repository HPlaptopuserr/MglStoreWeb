"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Search, X } from "lucide-react";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { organizationPath } from "@/lib/organization-links";
import { SearchOptionList } from "./search/SearchOptionList";
import { SearchScopeSelect } from "./search/SearchScopeSelect";
import {
  filterSearchOptions,
  searchDestination,
  SEARCH_SCOPES,
  type SearchScope,
} from "./search/search-model";
import { useSearchOptions } from "./search/use-search-options";

interface SearchBarProps {
  variant?: "light" | "dark";
}

export const SearchBar = ({ variant = "light" }: SearchBarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [scope, setScope] = useState<SearchScope>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { categories, organizations, retry } = useSearchOptions(open);
  const filteredCategories = useMemo(
    () => filterSearchOptions(categories.items, query),
    [categories.items, query],
  );
  const filteredOrganizations = useMemo(
    () => filterSearchOptions(organizations.items, query),
    [organizations.items, query],
  );
  const scopeLabel = SEARCH_SCOPES.find((option) => option.id === scope)?.label;
  useLockBodyScroll(open);

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [open]);

  function navigate(href: string) {
    if (pathname === "/products" && href.startsWith("/products?"))
      router.replace(href, { scroll: false });
    else router.push(href);
    setOpen(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const href = searchDestination(scope, query, categories.items);
    if (href) navigate(href);
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => {
          const params = new URLSearchParams(window.location.search);
          setQuery(params.get("search") ?? params.get("q") ?? "");
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`mx-auto flex h-12 w-full max-w-3xl items-center gap-3 rounded-full border-2 px-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-orange-500 xl:h-14 ${variant === "dark" ? "border-slate-600 bg-slate-900 text-white" : "border-orange-500 bg-white text-slate-700"}`}
      >
        <span className="shrink-0 border-r border-slate-200 pr-3 text-sm font-bold">
          {scopeLabel}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-slate-400">
          Хайх утгаа оруулна уу…
        </span>
        <Search size={20} aria-hidden="true" />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const bounds = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom
            )
              setOpen(false);
          }
        }}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-1rem)] max-w-5xl overflow-y-auto rounded-3xl border border-slate-100 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm open:animate-in open:fade-in"
      >
        <h2 id={titleId} className="sr-only">
          Бараа, ангилал, байгууллага хайх
        </h2>
        <form
          onSubmit={submit}
          className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white p-3 sm:gap-4 sm:p-5"
        >
          <SearchScopeSelect value={scope} onChange={setScope} />
          <label className="flex min-w-24 flex-1 items-center gap-2">
            <Search
              size={21}
              className="shrink-0 text-orange-500"
              aria-hidden="true"
            />
            <span className="sr-only">Хайх үг</span>
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Хайлт хийх…"
              type="search"
              className="min-w-0 w-full bg-transparent py-3 text-base outline-none placeholder:text-slate-400 sm:text-lg"
            />
          </label>
          <button
            type="submit"
            className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
          >
            Хайх
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Хайлтыг хаах"
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </form>

        <div className="grid min-h-72 sm:grid-cols-[1fr_320px]">
          <div className="max-h-[55dvh] space-y-6 overflow-y-auto overscroll-contain p-5 sm:p-7">
            {scope === "categories" ? (
              <SearchOptionList
                title="Тохирох ангиллууд"
                kind="category"
                state={categories}
                items={filteredCategories}
                onRetry={retry}
                onSelect={(category) =>
                  navigate(
                    `/products?${new URLSearchParams({ category: category.id })}`,
                  )
                }
              />
            ) : scope === "organizations" ? (
              <>
                <SearchOptionList
                  title="Байгууллагууд"
                  kind="organization"
                  state={organizations}
                  items={filteredOrganizations}
                  onRetry={retry}
                  onSelect={(organization) =>
                    navigate(organizationPath(organization))
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      searchDestination(scope, query) ?? "/organizations",
                    )
                  }
                  className="text-sm font-bold text-orange-600 hover:underline"
                >
                  Бүх байгууллагаас хайх →
                </button>
              </>
            ) : (
              <div className="flex h-full min-h-56 flex-col items-center justify-center gap-4 text-center">
                <span className="rounded-2xl bg-orange-50 p-4 text-orange-500">
                  <Search size={28} />
                </span>
                <h3 className="text-lg font-bold">
                  {query.trim()
                    ? `“${query.trim()}” хайх`
                    : scope === "new"
                      ? "Шинээр нэмэгдсэн бараа"
                      : "Та юу хайж байна вэ?"}
                </h3>
                <p className="max-w-sm text-sm leading-6 text-slate-500">
                  {scope === "new"
                    ? "Хайлтын үр дүнг хамгийн сүүлд нэмэгдсэнээр эрэмбэлнэ."
                    : "Барааны нэрээр хайх эсвэл төрөл сонгон ангилал, байгууллагаа олоорой."}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    navigate(searchDestination(scope, query) ?? "/products")
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
                >
                  {query.trim() ? "Хайлтын үр дүн харах" : "Бараа үзэх"}
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
          <aside className="max-h-[55dvh] space-y-7 overflow-y-auto overscroll-contain border-t border-slate-100 bg-slate-50/80 p-5 sm:border-l sm:border-t-0 sm:p-7">
            {scope !== "categories" && (
              <SearchOptionList
                title="Ангиллууд"
                kind="category"
                state={categories}
                items={filteredCategories}
                onRetry={retry}
                onSelect={(category) =>
                  navigate(
                    `/products?${new URLSearchParams({ category: category.id })}`,
                  )
                }
              />
            )}
            {scope === "all" && (
              <SearchOptionList
                title="Байгууллагууд"
                kind="organization"
                state={organizations}
                items={filteredOrganizations}
                onRetry={retry}
                onSelect={(organization) =>
                  navigate(organizationPath(organization))
                }
              />
            )}
            {scope === "categories" && (
              <p className="text-sm leading-6 text-slate-500">
                Ангиллын нэрээр шүүж, тохирох ангиллаа сонгоно уу. Олон илэрцтэй
                бол жагсаалтаас сонгоно.
              </p>
            )}
            {scope === "organizations" && (
              <p className="text-xs leading-5 text-slate-500">
                Энд эхний 24 байгууллага харагдана. «Хайх» товчоор бүх
                байгууллагаас хайна.
              </p>
            )}
          </aside>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
          <span>ESC — Хаах · ENTER — Хайх</span>
          <button
            type="button"
            onClick={() => navigate("/organizations")}
            className="font-bold text-orange-600 hover:underline"
          >
            Бүх байгууллага →
          </button>
        </div>
      </dialog>
    </div>
  );
};
