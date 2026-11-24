# POS reservation prevention — 2026-11-24

Expired SystemQR invoices previously retained stock even after the bank verified
that they were unpaid. The lifecycle worker recorded a review but never requested
provider cancellation. Finished payment records could also leave reservations
behind without a periodic repair pass.

## Behavior

- After fresh verified UNPAID evidence for an expired SystemQR invoice, request
  bank cancellation. If cancellation fails, perform another bank check. A fresh
  verified UNPAID response permits expiry of the inventory hold independently
  from bank cancellation, with a server audit bound to invoice, store, basket,
  provider identity, amount and expiry. Unknown/paid evidence retains the hold.
- Merge cancellation proof under the organization inventory lock and invoice row
  lock. A concurrent PAID/consumed invoice wins; payment evidence is preserved.
- Keep the basket reservation if another card or QR on that basket is unresolved.
- Run a separate repair sweep every 15 seconds, up to 25 baskets per pass across
  all organizations. Keyset pagination prevents unresolved stores starving others.
- Inspect reservations older than one minute. Age alone never releases stock:
  the existing payment-state checks must permit release. Orphan reservations with
  no associated payment are removed under the same lock used by authorization.
- Record releases and automatic cancellation in AuditLog. No stock quantity or
  payment identity is rewritten by the sweep.

## Limits

Unknown bank responses, pending/failed card attempts and
unconsumed approved payments retain stock. These are payment recovery cases, not
proof of an abandoned basket. Automatic expiry cancellation currently applies to
SystemQR, which supplies verified UNPAID evidence; QPay unknown evidence is retained.
Authenticated late-paid callbacks remain recoverable after confirmed cancellation.
After inventory hold expiry, the bank invoice remains EXPIRED with cancellation
unconfirmed and payment reconciliation enabled. A late payment is retained as PAID;
if the stock has since sold, ordinary sale validation prevents overselling and
keeps the payment in recovery instead of fabricating a completed sale.

## Minu cancellation failure investigation

MGL-319 invoice `6487ecb8-dd6d-4b70-808e-546e56ebf4bb` and MGL-Coffee&Store invoice
`7d45c925-fc35-43d7-9aa3-5a7d9017c8a9` returned Dynamic QR code `001` and legacy
code `0100`, both with the provider message "Системийн алдаа". Production platform
credentials reproduced the same failure as merchant credentials. Exact-invoice
and exact-amount bank checks confirmed UNPAID. Merchant identity matched the
organization configuration. These generic provider errors do not identify the
internal Minu cause; no successful bank cancellation is claimed.

The application correction prevents this provider failure from retaining an
expired unpaid stock hold indefinitely. Cancellation proof remains distinct
from inventory expiry; callbacks and periodic bank checks continue.

## Verification

On an isolated local PostgreSQL database:

- 45 checkout, QR lifecycle, cancellation, evidence and reservation checks passed,
  including failed cancellation followed by paid/unknown evidence, forged audit
  references, split payments, another cash customer and a late paid stock shortage.
- 51 card recovery checks passed, including mixed payments, concurrent sale
  finalization, unknown bank responses and explicit declines.
- API TypeScript validation and production compilation passed.

Production deploy requires only the API service, without a database migration or
frontend rebuild. Confirm the deployed commit, HTTP health and the startup log
`[pos stock] Reservation reconciliation enabled`.

Release events can be inspected using read-only SQL:

```sql
SELECT "createdAt", "meta"
FROM "AuditLog"
WHERE "meta" ->> 'event' IN (
  'POS_RESOLVED_RESERVATION_RELEASED',
  'POS_EXPIRED_UNPAID_QR_CANCELLED',
  'POS_EXPIRED_UNPAID_QR_STOCK_RELEASED'
)
ORDER BY "createdAt" DESC
LIMIT 50;
```
