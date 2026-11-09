# Recover an already-paid Minu card payment

Cashiers rebuild the original basket, then choose **Тохиргоо → Өмнө төлөгдсөн картын гүйлгээтэй холбох**. Choose the payment date and use **Minu-с шалгаж холбох** on the matching amount. Review the basket and use the normal **Гүйлгээ батлах** action to create a sale and receipt.

The reference list comes from this register's existing, unconsumed `CardPaymentAttempt` records, limited to 100 per Ulaanbaatar calendar day. This is not Minu's complete transaction statement. Each attachment calls Minu `checkTxn`; approval and a bank RRN are required, with an invoice identity check when returned by Minu. Manual-card attempts and attempts from other organizations/registers cannot be recovered here. No new invoice, authorization, refund, or charge is made.

Verification changes only the existing payment's approval/RRN metadata. Stock changes occur through the existing sale transaction. A conditional payment claim prevents duplicate consumption; stock, receipt creation, payment consumption, and idempotency recording roll back together when a sale fails. Verified references survive browser reload. Confirmed card payments cannot be removed through payment reset or silently turned into mock receipts after a missing sale endpoint.

Deploy both the API and Vendor application. No schema migration or payment credential changes are required. Local test merchants do not contain production transactions.

## Validation

- API and Vendor strict TypeScript checks.
- Provider parsing, recovery eligibility, browser persistence and missing-endpoint tests.
- `card-recovery.integration.test.ts` exercises HTTP routes with an isolated PostgreSQL database and a synthetic local Minu server, including cashier permissions, amount mismatch, bank refusal/outage, stock rollback, successful receipt creation, idempotent retry and simultaneous duplicate finalization.
- Integration tests require `CARD_RECOVERY_INTEGRATION=1` and a localhost database named `mgl_card_recovery_test_*` with the current Prisma schema. They never run against production. The test creates fixtures inside this disposable database; drop that database after the run.
