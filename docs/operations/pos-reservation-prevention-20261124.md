# POS reservation prevention — 2026-11-24

Expired SystemQR invoices previously retained stock even after the bank verified
that they were unpaid. The lifecycle worker recorded a review but never requested
provider cancellation. Finished payment records could also leave reservations
behind without a periodic repair pass.

## Behavior

- After fresh verified UNPAID evidence for an expired SystemQR invoice, request
  bank cancellation. Only a successful provider response permits release.
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

Unknown bank responses, failed cancellations, pending/failed card attempts and
unconsumed approved payments retain stock. These are payment recovery cases, not
proof of an abandoned basket. Automatic expiry cancellation currently applies to
SystemQR, which supplies verified UNPAID evidence; QPay unknown evidence is retained.
Authenticated late-paid callbacks remain recoverable after confirmed cancellation.

## Verification

On an isolated local PostgreSQL database:

- 39 checkout, QR lifecycle, cancellation, evidence and reservation checks passed.
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
  'POS_EXPIRED_UNPAID_QR_CANCELLED'
)
ORDER BY "createdAt" DESC
LIMIT 50;
```
