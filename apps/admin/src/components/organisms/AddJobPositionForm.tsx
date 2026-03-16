"use client";

import { useState } from "react";
import { Briefcase, Plus, X } from "lucide-react";
import { AdminButton } from "@/components/atoms/AddJobButton";

interface AddJobPositionFormProps {
  loading?: boolean;
  onSubmit: (data: { jobName: string }) => void | Promise<void>;
}

export function AddJobPositionForm({
  loading = false,
  onSubmit,
}: AddJobPositionFormProps) {
  const [open, setOpen] = useState(false);
  const [jobName, setJobName] = useState("");
  const [formError, setFormError] = useState("");

  const handleClose = () => {
    setOpen(false);
    setJobName("");
    setFormError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!jobName.trim()) return;

    try {
      await onSubmit({ jobName: jobName.trim() });
      handleClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Алдаа гарлаа");
    }
  };

  return (
    <div className="w-full sm:w-auto relative">
      <AdminButton
        type="button"
        icon={open ? <X size={16} /> : <Plus size={16} />}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? "Хаах" : "Ажлын байр нэмэх"}
      </AdminButton>

      {open && (
        <div className="absolute right-0 top-full mt-3 w-full sm:w-[360px] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Шинэ ажлын байр
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ажлын байрны анкет хүлээж авах албан тушаал
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Ажлын байрны нэр
                </label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md bg-violet-50 text-violet-500 transition-colors group-focus-within:bg-violet-100 group-focus-within:text-violet-600">
                    <Briefcase size={14} />
                  </div>
                  <input
                    type="text"
                    value={jobName}
                    onChange={(e) => {
                      setJobName(e.target.value);
                      if (formError) setFormError("");
                    }}
                    disabled={loading}
                    placeholder="Жишээ: Худалдааны зөвлөх"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm text-slate-900 transition-all focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>
              
              {formError && (
                <div className="text-xs font-medium text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                >
                  Болих
                </button>

                <AdminButton
                  type="submit"
                  loading={loading}
                  icon={<Plus size={16} />}
                >
                  Хадгалах
                </AdminButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
