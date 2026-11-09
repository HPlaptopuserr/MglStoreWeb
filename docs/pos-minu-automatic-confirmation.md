# Automatic Minu card confirmation

The normal Vendor checkout keeps checking the original card attempt after its initial terminal wait ends. No recovery dialog, new invoice, or second authorization is needed. Checks resume on browser focus, network reconnection, and restoration of a saved checkout. Explicit terminal approval is accepted without an RRN; the original invoice identifies that payment. API status `000` alone still does not prove payment, and a returned invoice must match.

The API also reconciles unconsumed Minu attempts from the last seven days, plus older attempts still holding a terminal guard, every 15 seconds in bounded batches. It updates bank state only. Receipt creation, stock movement, and payment consumption continue through the existing idempotent sale transaction. A closed browser resumes completion when its original saved basket is opened again. Previously erased baskets cannot be reconstructed from an amount alone.

Minu request IDs are saved in the browser before authorization and invoices are saved in the database before contacting Minu. Retrying the same authorization identity returns the existing attempt. An uncertain invoice response stays pending. Conditional writes prevent late provider responses from downgrading approval or consumption. Transient sale submission failures reuse the same sale ID for up to three retries.

Closing the Minu waiting overlay continues checks in the background; it does not cancel a bank transaction. Unresolved Minu payments cannot be silently removed or reset. An explicit terminal decline releases the payment entry. Cash, QPay, non-Minu terminal processing, split calculations, and eBarimt issuance retain their existing paths.

Terminal error handling distinguishes a returned failure from a lost response.
For an identified invoice, API status `000`, terminal status `10`, error `true`,
no RRN, and an exact `Пин буруу`, `System Error`, or `SystemError` message now end
the attempt as `DECLINED`, alongside the existing refusal messages. The original
provider response and checkout remain recorded. This clears the terminal guard
through its status condition and releases the failed basket's stock reservation;
it does not delete payment history, create a sale, or print a paid receipt.
The till keeps the cart and offers another payment. Replaying the same request
ID returns its failure; only a deliberate new attempt creates another invoice.
Blank outcomes, intermediate prompts, unmatched messages, transport failures,
and conflicting bank references continue to require checking the original
invoice. This is an application classification of those exact responses, not a
blanket rule that every status `10` or system/network error proves no debit.

Deploy the API before Vendor. Old Vendor clients remain compatible with the updated API. No schema migration or payment credential changes are required.

Validation covers RRN-less approval, delayed approval, provider outages, invoice mismatch, restoration, repeated authorization identity, stale status responses, server reconciliation, stock rollback, idempotent sale retry, concurrent payment consumption, and mixed card/QR/cash sales. Integration tests use a disposable local PostgreSQL database and a synthetic local Minu provider; they never charge a real terminal.

## Manual and API card modes

Retail tills select one card mode in Admin → POS register settings. The existing
`cardEnabled` setting stores that choice: `false` records a payment already taken
on a standalone terminal; `true` sends a payment to the configured API terminal.
Register responses expose the choice as `cardPaymentMode` (`MANUAL` or `API`),
separately from legacy organization fallback metadata. No database migration is
required. Manual checkout still completes immediately when the cashier records
the card payment and never contacts a provider.

An API till never falls back to manual payment on a health-check failure, missing
merchant credentials, or incomplete terminal configuration. The server also
rejects `manualCard: true` from old browser tabs. A failed bridge health check
ends the unstarted attempt as declined. After a charge is sent, a missing or
unrecognized response stays pending; it cannot complete a sale or print a paid
receipt. Explicit bridge approval/decline resolves the original attempt, and late
responses cannot downgrade an approved or consumed payment. Local bridge status
polling only reads the saved result; a lost terminal result needs verification
and must not be resolved by charging again or switching to manual mode.

Deploy the API fix first, followed by Vendor and Admin, and reload open tills.
Existing register mode selections are preserved. Before changing a till's mode,
resolve any payment already in progress on that terminal.
