# Recover an already-paid Minu card payment

Cashiers rebuild the original basket, then choose **Тохиргоо → Өмнө төлөгдсөн картын гүйлгээтэй холбох**. Choose the payment date and use **Minu-с шалгаж холбох** on the matching amount. Review the basket and use the normal **Гүйлгээ батлах** action to create a sale and receipt.

The reference list comes from this register's existing, unconsumed `CardPaymentAttempt` records, limited to 100 per Ulaanbaatar calendar day. This is not Minu's complete transaction statement. Each attachment calls Minu `checkTxn`; approval and a bank RRN are required, with an invoice identity check when returned by Minu. Manual-card attempts and attempts from other organizations/registers cannot be recovered here. No new invoice, authorization, refund, or charge is made.

Verification changes only the existing payment's approval/RRN metadata. Stock changes occur through the existing sale transaction. A conditional payment claim prevents duplicate consumption; stock, receipt creation, payment consumption, and idempotency recording roll back together when a sale fails. Verified references survive browser reload. Confirmed card payments cannot be removed through payment reset or silently turned into mock receipts after a missing sale endpoint.

Deploy both the API and Vendor application. No schema migration or payment credential changes are required. Local test merchants do not contain production transactions.

## Cashier terminal recovery

Cashiers can open **Терминалын түгжээ шалгаж тайлах** from the card checkout or
**Тохиргоо**, including when the browser no longer has the original basket.
The list belongs to the selected register's configured physical terminal and
organization. It includes recent unconsumed Minu payments and guarded unresolved
payments regardless of age. Reassigned terminals can inspect their previous
register's invoice within the same organization; payments are never matched or
attached to a new basket by amount.

**Minu-с шалгаж тайлах** only checks the existing invoice. A confirmed decline or
cancellation releases its guard through the saved status and releases stock only
when no other unresolved payment belongs to that checkout. The cart and provider
evidence remain. A paid result preserves the original payment for sale completion;
a consumed payment points to the existing receipt. The browser reconciles only
an already-attached attempt. It never authorizes another payment from this dialog.
Repeated or concurrent checks are safe; a newer approval/consumption wins over a
stale negative response. Checks are recorded in AuditLog with the cashier,
organization, terminal, attempt and outcome, without credentials or card details.

For Minu there is no implemented Agent cancellation endpoint. The cashier cancels
an active request on the physical terminal, then checks it here. If Minu continues
to return an unknown outcome, the guard remains and the dialog provides the invoice
for provider investigation. Neither elapsed time, a cashier checkbox, nor a failed
API call proves no debit. There is deliberately no force-unlock or manual-payment
fallback for such an invoice. The current flow cannot safely release a transaction
whose outcome Minu has never confirmed.

Automatic reconciliation and cashier checks require the original invoice identity
before settling an outcome. API-level errors, unidentified replies, and terminal
errors conflicting with a bank RRN remain unresolved rather than unlocking.

Deploy API before Vendor; no schema migration is needed. Reload open tills.
Tests cover missing responses, outages, invalid identities, conflicting references,
cross-organization/terminal access, old locks, repeated checks, terminal cancellation,
approval during recovery, concurrent approval, completed sales and explicit retry.

## Validation

- API and Vendor strict TypeScript checks.
- Provider parsing, recovery eligibility, browser persistence and missing-endpoint tests.
- `card-recovery.integration.test.ts` exercises HTTP routes with an isolated PostgreSQL database and a synthetic local Minu server, including cashier permissions, amount mismatch, bank refusal/outage, stock rollback, successful receipt creation, idempotent retry and simultaneous duplicate finalization.
- Integration tests require `CARD_RECOVERY_INTEGRATION=1` and a localhost database named `mgl_card_recovery_test_*` with the current Prisma schema. They never run against production. The test creates fixtures inside this disposable database; drop that database after the run.
