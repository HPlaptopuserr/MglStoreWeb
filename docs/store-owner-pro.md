# Store owners Pro

The `store-owners` mini app charges **100,000 MNT** for one calendar month of
ordering access. This entitlement belongs to the authenticated user, independently
of organization ownership and general MGL membership. Administrators can also
activate Pro immediately by saving a registered user's phone in the App Control
ordering-access list. These account-bound grants remain active until removed;
users with a grant do not need to pay. All selected vendor products are
covered; product purchases are charged separately.

## Runtime setup

1. Apply migration `20261110010000_store_owner_pro` through the normal database
   release workflow, generate the Prisma client, and deploy the API.
2. Set `STORE_OWNERS_MINU_MERCHANT_CODE` to the merchant receiving Pro fees.
   `STORE_OWNERS_MINU_USERNAME` and `STORE_OWNERS_MINU_PASSWORD` may override the
   existing `SYSTEMQR_USERNAME` and `SYSTEMQR_PASSWORD`. There is no fallback to a
   vendor's merchant or a client-supplied amount.
3. Set `API_PUBLIC_URL` for the provider callback. Polling also verifies payments
   if a callback is delayed. Keep credentials exclusively on the server.
4. Enable `store-owners` and choose vendor sources in Admin → App Control → MGL
   Store. The phone-entry list grants immediate Pro access as an alternative to payment.
5. Install the updated Flutter app. An old API without the Pro routes displays a
   retry state and cannot activate paid access.

## Payment and access

- `GET /api/store/store-owners/pro`: authenticated access, price, expiry, source
  (`ADMIN`, `PAYMENT`, or `NONE`), and catalog availability. Admin-granted access
  has no payment expiry and is also honored by catalog/checkout authorization. Recovers the latest pending invoice from the provider
  after a missed callback or app termination.
- `POST /api/store/store-owners/pro/invoice`: creates or reuses an account-bound
  pending invoice. The server fixes the amount at 100,000 MNT. A database row
  lock serializes concurrent creation for the user. Active subscribers cannot
  purchase a second month early; there is no automatic renewal.
- `POST /api/store/store-owners/pro/invoices/:id/check`: verifies only the current
  user's invoice against its stored provider invoice and merchant.
- `/api/store/store-owners/pro/callback?invoiceId=...`: public provider callback.
  Callback payloads never grant access; a provider lookup is required.

Only the atomic `PENDING` → `PAID` transition records activation and expiry.
Repeated callbacks and checks cannot extend the same payment. The activation
clock starts when the server verifies payment. The next calendar month uses
Asia/Ulaanbaatar time and clamps month-end dates (January 31 → February 28/29).
At the expiry instant ordering is denied by both the catalog and checkout API,
including requests omitting `miniAppId`. The mobile countdown is a QR display
timeout; a late verified payment can still activate access.

Payment records retain their provider details for verification and auditing.
They contain no provider password. The Pro fee is separate from product order
history and does not grant vendor management permissions.

## Verification

```sh
pnpm exec tsx --test apps/api/src/services/store-mini-app-settings.test.ts \
  apps/api/src/routes/store/mini-app-catalog.routes.test.ts \
  apps/api/src/routes/store/store-owner-pro.routes.test.ts
pnpm --filter @mgl/api type-check
pnpm --filter @mgl/database db:validate
```

Flutter checks from `mglstore/apps/mgl_store`:

```sh
flutter test --no-pub test/features/store_owner_pro \
  test/features/mini_apps/mini_app_products_test.dart \
  test/features/cart/cart_checkout_test.dart \
  test/features/cart/minu_pos_payment_sheet_test.dart
```

Provider tests use mocked bank responses. Before production release, verify the
configured merchant's invoice creation, callback, bank-app return, and settlement
with an approved end-to-end payment; the automated tests do not move real money.
