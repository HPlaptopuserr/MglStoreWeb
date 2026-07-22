"use client";

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Copy,
  Eye,
  Pencil,
  FileSpreadsheet,
  ChevronDown,
  X,
  Save,
  FileDown,
  Type,
  AlignLeft,
  List,
  CheckSquare,
  Circle,
  Calendar,
  Hash,
  ToggleLeft,
  ClipboardList,
  ArrowLeft,
  Send,
  Settings2,
  MoreVertical,
  ListPlus,
  Link2,
  Check,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";
import { detectWebBaseUrl } from "@/lib/sections/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

import {
  FIELD_TYPES,
  escapeCSV,
  getFormLink,
  uid,
  type FieldOption,
  type FieldType,
  type Form,
  type FormField,
  type FormResponse,
  type View,
} from "./form-builder.model";
import { FormBuilderView } from "./FormBuilderView";
import { FormListView } from "./FormListView";
import { FormPreviewView } from "./FormPreviewView";
import { FormResponsesView } from "./FormResponsesView";
export function FormBuilderTool() {
  const [forms, setForms] = useState<Form[]>([]);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [view, setView] = useState<View>("list");
  const [activeFormId, setActiveFormId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchForms = useCallback(async () => {
    try {
      const res = await adminFetch(`${API}/admin/forms`);
      if (res.ok) setForms(await res.json());
    } catch {
      // ignore
    }
  }, []);

  const fetchResponses = useCallback(async (formId: string) => {
    try {
      const res = await adminFetch(`${API}/admin/forms/${formId}`);
      if (res.ok) {
        const data = await res.json();
        setResponses(data.responses || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchForms().then(() => setMounted(true));
  }, [fetchForms]);

  const activeForm = useMemo(
    () => forms.find((f) => f.id === activeFormId) ?? null,
    [forms, activeFormId],
  );

  const activeResponses = useMemo(
    () => responses.filter((r) => r.formId === activeFormId),
    [responses, activeFormId],
  );

  // ── Actions ──

  const createForm = useCallback(async () => {
    try {
      const res = await adminFetch(`${API}/admin/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Шинэ маягт",
          description: "",
          fields: [],
        }),
      });
      if (res.ok) {
        const form = await res.json();
        setForms((prev) => [form, ...prev]);
        setActiveFormId(form.id);
        setView("builder");
      }
    } catch {
      // ignore
    }
  }, []);

  const duplicateForm = useCallback(
    async (id: string) => {
      const src = forms.find((f) => f.id === id);
      if (!src) return;
      try {
        const res = await adminFetch(`${API}/admin/forms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `${src.title} (хуулбар)`,
            description: src.description,
            fields: src.fields,
          }),
        });
        if (res.ok) {
          await fetchForms();
        }
      } catch {
        // ignore
      }
    },
    [forms, fetchForms],
  );

  const deleteForm = useCallback(
    async (id: string) => {
      try {
        await adminFetch(`${API}/admin/forms/${id}`, { method: "DELETE" });
        setForms((prev) => prev.filter((f) => f.id !== id));
        if (activeFormId === id) {
          setActiveFormId(null);
          setView("list");
        }
      } catch {
        // ignore
      }
    },
    [activeFormId],
  );

  const updateForm = useCallback(async (updated: Form) => {
    try {
      const res = await adminFetch(`${API}/admin/forms/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: updated.title,
          description: updated.description,
          fields: updated.fields,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setForms((prev) =>
          prev.map((f) => (f.id === saved.id ? { ...f, ...saved } : f)),
        );
      }
    } catch {
      // ignore
    }
  }, []);

  const submitResponse = useCallback(
    async (data: Record<string, string | string[]>) => {
      if (!activeForm?.slug) return;
      try {
        const res = await adminFetch(
          `${API}/forms/${activeForm.slug}/responses`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data }),
          },
        );
        if (res.ok) {
          const resp = await res.json();
          setResponses((prev) => [...prev, resp]);
        }
      } catch {
        // ignore
      }
    },
    [activeForm],
  );

  const deleteResponse = useCallback(async (id: string) => {
    try {
      await adminFetch(`${API}/admin/form-responses/${id}`, {
        method: "DELETE",
      });
      setResponses((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // ignore
    }
  }, []);

  const openBuilder = useCallback((id: string) => {
    setActiveFormId(id);
    setView("builder");
  }, []);

  const openPreview = useCallback((id: string) => {
    setActiveFormId(id);
    setView("preview");
  }, []);

  const openResponses = useCallback(
    (id: string) => {
      setActiveFormId(id);
      fetchResponses(id);
      setView("responses");
    },
    [fetchResponses],
  );

  if (!mounted) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {view === "list" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            <FormListView
              forms={forms}
              onCreate={createForm}
              onOpen={openBuilder}
              onPreview={openPreview}
              onResponses={openResponses}
              onDuplicate={duplicateForm}
              onDelete={deleteForm}
            />
          </div>
        </div>
      )}
      {view === "builder" && activeForm && (
        <FormBuilderView
          form={activeForm}
          onUpdate={updateForm}
          onBack={() => setView("list")}
          onPreview={() => setView("preview")}
          onResponses={() => setView("responses")}
        />
      )}
      {view === "preview" && activeForm && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <FormPreviewView
            form={activeForm}
            onBack={() => setView("builder")}
            onSubmit={submitResponse}
          />
        </div>
      )}
      {view === "responses" && activeForm && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            <FormResponsesView
              form={activeForm}
              responses={activeResponses}
              onBack={() => setView("builder")}
              onDelete={deleteResponse}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Form List ───────────────────────────────────────────────────────────────
