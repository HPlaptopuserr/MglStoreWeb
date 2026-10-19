# Shared warehouse storefront

`/shared-store` is the customer storefront for explicitly configured central warehouses. The home navigation places it after `2003`. Publication uses the existing Admin → App Control → Дундын дэлгүүр source selection and each inventory row's `showOnWeb` switch. The production source requested for this release is `5dcda21f-f253-4484-90de-e96e5728f383` (Дундын Дэлгүүр ЭМ ЖИ ЭЛ БМБЧ ТРЕЙД ХХК).

Warehouse products retain `organizationId = null` and their original managing warehouse. Customer sales use `WarehouseRetailOrder` instead of a fictitious vendor. Apply migration `20261019150000_warehouse_retail_orders` before deploying the API. No credentials or new merchant accounts are required: invoices use the warehouse's existing `paymentAccountId` and the server's existing Minu account registry. The original merchant is retained on each invoice for verification after account changes.

Checkout uses server prices, validates publication and ownership, reserves canonical inventory under row locks, and accepts one warehouse per basket. A customer checkout key prevents duplicate creation on retries. Pending reservations last 30 minutes and participate in procurement availability. Successful provider verification deducts inventory once and creates a ledger entry. Late payments with unavailable stock are recorded as paid with a fulfillment issue for manual resolution; stock never becomes negative.

Customers resume payments and view status through the storefront's order history. A one-minute worker also reconciles unpaid invoices when the buyer closes the browser. Warehouse operators see paid orders under Online Orders and advance them through preparation, shipping and completion. Warehouse access is checked independently of customer access.

## Validation

- API, web and warehouse TypeScript checks.
- Policy and catalog regression tests; `warehouse-retail.integration.test.ts` uses a disposable local database named `wms_test_*` and a local synthetic Minu gateway. Set `WAREHOUSE_RETAIL_INTEGRATION=1` and an isolated local `DATABASE_URL` to run it.
- Integration covers concurrent last-stock purchases, repeated checkout/invoice/payment requests, source isolation, unpublished inventory, procurement reservations, merchant routing, inventory deduction and late payments. It does not make a real payment.
