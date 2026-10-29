# Shared warehouse storefront

`/shared-store` is the customer storefront for explicitly configured central warehouses. The home navigation places it after `2003`. Publication uses the existing Admin → App Control → Дундын дэлгүүр source selection and each inventory row's `showOnWeb` switch. The production source requested for this release is `5dcda21f-f253-4484-90de-e96e5728f383` (Дундын Дэлгүүр ЭМ ЖИ ЭЛ БМБЧ ТРЕЙД ХХК).

Warehouse products retain `organizationId = null` and their original managing warehouse. Customer sales use `WarehouseRetailOrder` instead of a fictitious vendor. Apply migration `20261019150000_warehouse_retail_orders` before deploying the API. No credentials or new merchant accounts are required: invoices use the warehouse's existing `paymentAccountId` and the server's existing Minu account registry. The original merchant is retained on each invoice for verification after account changes.

Checkout uses server prices, validates publication and ownership, reserves canonical inventory under row locks, and accepts one warehouse per basket. A customer checkout key prevents duplicate creation on retries. Pending reservations last 30 minutes and participate in procurement availability. Successful provider verification deducts inventory once and creates a ledger entry. Late payments with unavailable stock are recorded as paid with a fulfillment issue for manual resolution; stock never becomes negative.

Customers resume payments and view status through the storefront's order history. A one-minute worker also reconciles unpaid invoices when the buyer closes the browser. Warehouse operators see paid orders under Online Orders and advance them through preparation, shipping and completion. Warehouse access is checked independently of customer access.

## Validation

- API, web and warehouse TypeScript checks.
- Policy and catalog regression tests; `warehouse-retail.integration.test.ts` uses a disposable local database named `wms_test_*` and a local synthetic Minu gateway. Set `WAREHOUSE_RETAIL_INTEGRATION=1` and an isolated local `DATABASE_URL` to run it.
- Integration covers concurrent last-stock purchases, repeated checkout/invoice/payment requests, source isolation, unpublished inventory, procurement reservations, merchant routing, inventory deduction and late payments. It does not make a real payment.


## Warehouse investor viewers

Warehouse → **Хэрэглэгчид · Viewer** (`/viewers`), or **Хэрэглэгч нэмэх** on the investor report. The warehouse's assigned operators and platform warehouse administrators can add/revoke viewers. Viewers cannot list or manage other viewers. The same panel also remains available in Admin → Warehouses → open the shared store → **Хөрөнгө оруулагчид · Viewer**. Add an existing active MGL Store user by their registered eight-digit phone number (`+976` accepted). No new password, operator setup token, organization membership or platform role is created. Remove a viewer from the same panel; access is checked against the database on every report request and grants/revocations are audited.

The user signs in to `warehouse.mglstore.mn` with their existing email/phone and password. Viewer access opens `/investor`; operational pages redirect there and existing warehouse mutation endpoints continue to require operator or platform permissions. Permissions are scoped per warehouse, including users who operate another warehouse. Existing operator/platform privileges are retained.

The report lists current owned products and warehouse quantities, inventory cost/value, fully paid retail/wholesale invoices, saved cost and gross profit. Pagination happens in the database, totals use the complete filtered set, and dates use Ulaanbaatar calendar boundaries regardless of the PostgreSQL server timezone. Customer contact details, payment credentials and private shipping addresses are excluded.

Apply `20261029030000_warehouse_viewers` before the new API. It adds warehouse viewer assignments, audit actions and nullable sales cost snapshots. Checkout stores retail unit costs; wholesale invoices store their total cost when created or edited before payment. Reduced approval quantities invalidate an incompatible cost snapshot. Historical costs remain NULL rather than using today's product costs. Incomplete costs are reported explicitly; aggregate gross profit is withheld if any included invoice lacks a cost. These are gross paid-order figures, excluding partial payments, fulfillment issues and cancelled/rejected orders; operating costs, taxes and returns are not deducted.

Validation: API/Admin/Warehouse production builds, warehouse ESLint, 16 focused policy/regression/integration tests against an isolated `wms_test_*` PostgreSQL database, and browser checks at mobile and desktop sizes. The viewer integration suite covers grants, duplicate grants, warehouse isolation, mutation denial, mixed operator/viewer roles, immediate revocation, disabled users, privacy, pagination, cost immutability, missing costs and Ulaanbaatar date boundaries. Run it only with `WAREHOUSE_VIEWER_INTEGRATION=1` and a disposable local `DATABASE_URL`.
