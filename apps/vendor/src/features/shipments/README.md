# Vendor stock requests

The `/shipments` route is a server entry point. `StockRequestsWorkspace.tsx`
composes the client workflow; it owns view selection and connects domain hooks
to presentation components. Business rules and endpoint contracts remain unchanged.

## Responsibilities

- `components/`: supply warehouse selection, product catalog/cards, checkout,
  request history, payment history, and their individual dialogs. Dialog slots
  keep history and checkout components independent of document/payment state.
- `hooks/useStockRequestData.ts`: organization identity, request history, supply
  warehouses, outstanding balances, refresh and cancellation.
- `hooks/useWarehouseCatalog.ts`: warehouse navigation, search debounce, category
  selection, paginated loading, and suggested cart initialization.
- `hooks/useStockRequestCart.ts`: cart quantities, delivery fields, and totals.
- `hooks/useStockRequestSubmission.ts`: validation, submission, confirmation,
  outstanding-payment handling, and successful-order transitions.
- `hooks/useStockRequestPayments.ts`: invoices, payment detail, printing, and
  development-only payment confirmation.
- `hooks/useStockRequestDocuments.ts`: dispatch document upload/removal and
  reconciliation into request history and the selected request.
- `types/`: request, payment, inventory, session identity, and recommendation
  contracts. Hooks do not import contract types from UI components.
- `utils/`: paginated catalog response normalization and asset URL handling.
- `stock-request.constants.ts`: request status presentation and upload limits.

Feature-specific components previously in `components/organisms` now live here:
`LowStockSuggestions`, `WarehouseProductRecommendations`, and `StockRequestFilters`.
The existing delivery-location and payment-QR components are in `components/`.

Future replenishment policies should use server-side inventory and demand
calculations. Keep that work separate from this behavior-preserving refactor;
the current low-stock thresholds and recommendation quantities are unchanged.
