# Vendor stock requests

The `/shipments` route is a server entry point. `StockRequestsWorkspace.tsx`
composes the client workflow; it owns view selection and connects domain hooks
to presentation components. Procurement is available to active vendors from every active central warehouse;
organization membership and stock-request permissions are still enforced.

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

## Catalog availability

Warehouse assignments remain available for administration, but active VENDOR
organizations do not need an assignment to list, browse, receive recommendations
or order from an active CENTRAL warehouse. Internal, inactive and deleted
warehouses remain inaccessible. Non-vendor organizations retain their explicit
assignment policy. The shared API procurement scope is deliberately separate
from warehouse management permissions.

An outstanding invoice blocks a new order submission, not catalog browsing.
After a successful order, users can continue viewing the selected warehouse or
open order history. The catalog refreshes when returning from checkout so stock
availability reflects reservations. Product cards show uncropped images, stock,
SKU, price and labeled quantity controls; unavailable products cannot be added.

Verification: `vendor-procurement.integration.test.ts` exercises real HTTP routes
with a disposable local PostgreSQL database (explicit
`VENDOR_PROCUREMENT_INTEGRATION=1`). `components/stock-catalog.test.tsx` verifies
catalog visibility with an unpaid invoice and the success dialog navigation.
