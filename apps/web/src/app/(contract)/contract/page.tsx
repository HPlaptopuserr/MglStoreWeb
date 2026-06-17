"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LoginModal } from "@/components/organisms/auth/LoginModal";
import {
  ContractCatalogEmptyState,
  ContractCatalogHero,
  ContractCatalogToolbar,
  ContractTemplateCard,
  type ContractCatalogTemplate,
} from "./_components/ContractCatalogComponents";

export default function ContractCatalogPage() {
  const { user, loading: authLoading, login, register } = useAuth();
  const [templates, setTemplates] = useState<ContractCatalogTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/contracts/available`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) throw new Error(data?.error || "Гэрээний жагсаалт ачаалахад алдаа гарлаа");
        setTemplates(data.contracts || []);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Гэрээний жагсаалт ачаалахад алдаа гарлаа"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((template) =>
      `${template.title} ${template.description} ${template.feePlanLabel}`.toLowerCase().includes(q),
    );
  }, [query, templates]);

  const submissionTotal = useMemo(
    () => templates.reduce((sum, item) => sum + item.submissionCount, 0),
    [templates],
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_44%,#ffffff_100%)] text-slate-950">
      <ContractCatalogHero
        isGuest={!authLoading && !user}
        onAuthOpen={() => setAuthOpen(true)}
      />

      <div className="container mx-auto flex flex-col gap-6 px-4 py-8 lg:px-8">
        <ContractCatalogToolbar
          query={query}
          total={filtered.length}
          submissionTotal={submissionTotal}
          onQueryChange={setQuery}
        />

        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-[28px] border-2 border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
              Гэрээнүүдийг ачаалж байна...
            </div>
          </div>
        ) : error ? (
          <div className="rounded-[28px] border-2 border-rose-200 bg-rose-50 p-5 text-sm font-black text-rose-800">{error}</div>
        ) : filtered.length === 0 ? (
          <ContractCatalogEmptyState />
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((template) => (
              <ContractTemplateCard
                key={template.id}
                template={template}
                isAuthenticated={Boolean(user)}
                onAuthOpen={() => setAuthOpen(true)}
              />
            ))}
          </section>
        )}
      </div>

      {authOpen && (
        <LoginModal
          open={authOpen}
          onClose={() => { setAuthOpen(false); setAuthError(""); }}
          onLogin={async (identifier, password, options) => {
            setAuthError("");
            setAuthBusy(true);
            try {
              const result = await login(identifier, password, options);
              if (result?.requiresEmailOtp) return result;
              setAuthOpen(false);
            } catch (err: unknown) {
              setAuthError(err instanceof Error ? err.message : "Нэвтрэхэд алдаа гарлаа.");
            } finally {
              setAuthBusy(false);
            }
          }}
          onRegister={async (fullName, identifier, password, options) => {
            setAuthError("");
            setAuthBusy(true);
            try {
              await register(fullName, identifier, password, options);
              setAuthOpen(false);
            } catch (err: unknown) {
              setAuthError(err instanceof Error ? err.message : "Бүртгүүлэхэд алдаа гарлаа.");
            } finally {
              setAuthBusy(false);
            }
          }}
          isLoading={authBusy}
          error={authError}
        />
      )}
    </main>
  );
}
