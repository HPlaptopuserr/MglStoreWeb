# POS split payments

The payment bar contains Cash, Card, QR, Credit and **Хэсэгчилсэн**. The last action opens a three-row allocation interface for Card, QR and Cash. Each row supports a manual amount or the full remaining balance; one row at a time can calculate the remainder automatically. Zero rows are skipped, accepted payment evidence locks its row, and a pending bank confirmation disables further payment actions. The plan must exactly match the total before collecting a payment.

Examples for 10,000₮: Card 2,000 + QR 7,000 + Cash 1,000, or Card 2,000 + QR 8,000 + Cash 0. In the planner, payments are collected in Card → QR → Cash order, skipping zeros.

Cashiers may also complete a basket through the individual payment methods. For a 10,000₮ basket: select Card and enter 5,000; wait for approval; select QR and enter 2,000; wait for bank confirmation; select Cash and enter 3,000; confirm the sale. The receipt preserves all three payment lines.

Bank amount inputs accept explicit amounts with at most two decimal places, default an empty input to the remaining balance, and reject invalid, zero, or excessive values. Cash still distinguishes money received from the amount applied and calculates change normally. Pending payments do not reduce the outstanding balance, and another payment cannot start until pending verification finishes. Verified bank payment lines cannot be removed as if unpaid.

Confirmed partial payments, including cash-first checkouts, survive reload under the existing checkout recovery key. The standard sale endpoint checks the exact payment sum, approved card attempts, paid QR invoices, scope, current stock and current prices. It atomically creates one sale, consumes each bank reference, and deducts stock once. No schema migration is needed.

Validation: amount-policy and checkout-recovery tests, cashier HTTP integration for 5,000 card + 2,000 QR + 3,000 cash (pending QR rejection, under/overpayment rejection, receipt breakdown, retry without additional stock deduction), and a synthetic UI click-through using the real checkout components. Tests do not charge real cards.

Per-method status badges distinguish successful, failed, waiting, unpaid and unused rows. A lost bank response is shown as unknown, never as a failure that invites another charge. Failed QR setup does not remove approved card evidence. Pending card attempt references persist for later status checks; these checks do not authorize a new charge. The large completion message requires a recorded receipt.
