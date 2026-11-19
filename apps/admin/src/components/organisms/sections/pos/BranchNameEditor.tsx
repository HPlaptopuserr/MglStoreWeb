"use client";

import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { API, adminFetch } from "@/lib/api";

type BranchNameEditorProps = {
  organizationId: string;
  branch: { id: string; name: string };
  onSaved: (branch: { id: string; name: string }) => void;
};

export function BranchNameEditor({
  organizationId,
  branch,
  onSaved,
}: BranchNameEditorProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(branch.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function save() {
    const trimmedName = name.trim();
    if (!trimmedName || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await adminFetch(
        `${API}/partners/${encodeURIComponent(organizationId)}/branches/${encodeURIComponent(branch.id)}/name`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName }),
        },
      );
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const message =
          payload &&
          typeof payload === "object" &&
          "message" in payload &&
          typeof payload.message === "string"
            ? payload.message
            : "Салбарын нэр хадгалахад алдаа гарлаа.";
        throw new Error(message);
      }
      onSaved({ id: branch.id, name: trimmedName });
      setEditing(false);
      setSuccess("Салбарын нэр хадгалагдлаа.");
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Салбарын нэр хадгалахад алдаа гарлаа.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2">
      {editing ? (
        <div className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <label className="block text-xs font-semibold text-indigo-700">
            Салбарын шинэ нэр
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={saving}
              maxLength={200}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void save();
                }
                if (event.key === "Escape" && !saving) setEditing(false);
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </label>
          <p className="text-xs text-slate-600">
            Энэ салбарын бүх касс, баримтад шинэ нэр харагдана. Кассын хуудсаа
            шинэчилнэ үү.
          </p>
          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || !name.trim() || name.trim() === branch.name}
              onClick={() => void save()}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && (
                <Loader2
                  size={12}
                  className="animate-spin"
                  aria-hidden="true"
                />
              )}
              {saving ? "Хадгалж байна…" : "Салбарын нэр хадгалах"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(false)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Болих
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setName(branch.name);
            setError("");
            setSuccess("");
            setEditing(true);
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          <Pencil size={12} aria-hidden="true" /> Салбарын нэр засах
        </button>
      )}
      {success && (
        <p role="status" className="mt-1 text-xs text-emerald-700">
          {success}
        </p>
      )}
    </div>
  );
}
