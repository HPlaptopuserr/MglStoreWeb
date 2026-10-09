"use client";
import { StocktakeEditor } from "./StocktakeEditor";
import { secondaryClass, StocktakeOverview } from "./StocktakeOverview";
import { useStocktakes } from "./useStocktakes";
import { StocktakeConfirmation } from "./useConfirmation";
export function StocktakesWorkspace() {
  const state = useStocktakes();
  return (
    <main className="space-y-5 text-slate-900">
      <StocktakeConfirmation
        message={state.confirmation.message}
        onAnswer={state.confirmation.answer}
      />
      <h1 className="sr-only">Бараа тооллого</h1>
      {state.error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          {state.error}
          <button
            className={`${secondaryClass} ml-3`}
            disabled={state.busy}
            onClick={state.reload}
          >
            Дахин холбогдох
          </button>
        </div>
      )}
      {state.notice && (
        <p
          role="status"
          className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"
        >
          {state.notice}
        </p>
      )}
      {!state.overview && !state.error && (
        <p
          role="status"
          className="animate-pulse rounded-2xl bg-white p-12 text-center text-slate-500"
        >
          Тооллогын мэдээлэл ачаалж байна…
        </p>
      )}
      {state.session ? (
        <StocktakeEditor
          key={state.session.id}
          session={state.session}
          loadForExport={state.loadForExport}
          registers={state.overview?.registers ?? []}
          canManageProducts={state.overview?.canManageProducts ?? false}
          onAddProduct={state.addProduct}
          onResolveProduct={state.resolveProduct}
          edits={state.edits}
          busy={state.busy}
          canApprove={state.overview?.canApprove ?? false}
          onSaveCount={state.saveCount}
          onAction={state.act}
          onClose={state.close}
          onReload={() => state.open(state.session!.id)}
        />
      ) : (
        state.overview && (
          <StocktakeOverview
            data={state.overview}
            loadForExport={state.loadForExport}
            busy={state.busy}
            onCreate={state.create}
            onOpen={state.open}
          />
        )
      )}
    </main>
  );
}
