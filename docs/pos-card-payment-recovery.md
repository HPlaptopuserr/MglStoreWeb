# Recover an already-paid Minu card payment

Cashiers rebuild the original basket, then choose **Тохиргоо → Өмнө төлөгдсөн картын гүйлгээтэй холбох**. Choose the payment date and use **Minu-с шалгаж холбох** on the matching amount. Review the basket and use the normal **Гүйлгээ батлах** action to create a sale and receipt.

The reference list comes from this register's existing, unconsumed `CardPaymentAttempt` records, limited to 100 per Ulaanbaatar calendar day. This is not Minu's complete transaction statement. Each attachment calls Minu `checkTxn`; approval and a bank RRN are required, with an invoice identity check when returned by Minu. Manual-card attempts and attempts from other organizations/registers cannot be recovered here. No new invoice, authorization, refund, or charge is made.

Verification changes only the existing payment's approval/RRN metadata. Stock changes occur through the existing sale transaction. A conditional payment claim prevents duplicate consumption; stock, receipt creation, payment consumption, and idempotency recording roll back together when a sale fails. Verified references survive browser reload. Confirmed card payments cannot be removed through payment reset or silently turned into mock receipts after a missing sale endpoint.

Deploy both the API and Vendor application. No schema migration or payment credential changes are required. Local test merchants do not contain production transactions.

## Continue serving customers during an unknown Minu outcome

Vendor retail and Org self-service automatically save an uncertain Minu checkout to the API before clearing the active basket. Minu authorization and the initial status inquiries share a 30-second wall-clock deadline, displayed as a decreasing countdown on both payment screens. Individual inquiries use at most 12 seconds or the remaining time, whichever is shorter. Lost inquiries retry the original invoice within that same budget; late HTTP responses cannot extend the wait or update a different checkout. Expiry ends only the browser wait, not the bank transaction. The saved record retains the original invoice, sale identity, complete browser recovery snapshot and any stock reservation. The next customer uses an independent basket and available cash/QR methods (self-service uses QR). The original Minu terminal remains unavailable for another card request until its outcome is known. This keeps the till usable without pretending a bank transaction was cancelled.

The API checks bank state in the background. The saved basket list displays unknown, approved or declined results. Unknown baskets cannot be restored for another payment. Once the result is final, a cashier can restore the original basket when the current checkout is empty. An approved basket uses its existing payment to complete the normal receipt/eBarimt flow; it never sends a new invoice. A declined basket can be retried normally. A late result does not replace the current customer's basket or print the previous customer's receipt automatically.

`GET /pos/payments/card/deferred` and `POST /pos/payments/card/deferred/:attemptId` are register-authorized recovery metadata operations. They never change bank status or remove terminal guards. Only declined snapshots can be acknowledged out of the queue; approved snapshots remain until the existing sale transaction consumes the payment. Minu dispatch acknowledgements cannot overwrite a newer saved snapshot. Same-order card retries and alternate cash/sale completion are rejected while an unresolved or unattached approved card payment exists. Self-service authorization now persists a UUID before sending and binds payment to the original restaurant ticket and client sale ID.

The API must be deployed before Vendor and Org. Existing browsers continue their previous behavior until refreshed. If the API cannot durably save the snapshot, the current basket is retained. A full payment-provider outage can still make its card/QR channels unavailable; this change does not create an offline payment method or authorize unsafe card retries.

## Provider cancellation contract

Reviewed the supplied `AGENT_Terminal_connection - eng.pdf`, POS Agent v1.0 dated 2023-08-30, all seven pages. It documents POST `/agent/login` (page 4), POST `/agent/invoice` (page 5), POST `/agent/checkTxn` (page 6), and a merchant-side Basic Authentication webhook for transaction confirmation (page 7). It does not document cancellation, void/reversal, terminal readiness, or a provider-enforced payment expiry. The webhook is an inbound result notification, not an outbound cancellation operation.

No cancellation endpoint is inferred from this document. A newer provider contract is needed to implement automatic cancellation, including request identity, final cancellation versus acceptance, already-paid responses, and timeout/retry semantics. An exact final cancellation received through the existing invoice inquiry is handled as a decline and permits a new attempt. A missing response or elapsed 30 seconds does not release the terminal guard.

## Validation

- API and Vendor strict TypeScript checks.
- Provider parsing, recovery eligibility, browser persistence and missing-endpoint tests.
- `card-recovery.integration.test.ts` exercises HTTP routes with an isolated PostgreSQL database and a synthetic local Minu server, including cashier permissions, amount mismatch, bank refusal/outage, stock rollback, successful receipt creation, idempotent retry and simultaneous duplicate finalization.
- Integration tests require `CARD_RECOVERY_INTEGRATION=1` and a localhost database named `mgl_card_recovery_test_*` with the current Prisma schema. They never run against production. The test creates fixtures inside this disposable database; drop that database after the run.
