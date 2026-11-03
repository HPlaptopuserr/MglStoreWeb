# Automatic Minu card confirmation

The normal Vendor checkout keeps checking the original card attempt after its initial terminal wait ends. No recovery dialog, new invoice, or second authorization is needed. Checks resume on browser focus, network reconnection, and restoration of a saved checkout. Explicit terminal approval is accepted without an RRN; the original invoice identifies that payment. API status `000` alone still does not prove payment, and a returned invoice must match.

The API also reconciles unconsumed Minu attempts from the last seven days every 15 seconds, in bounded batches. It updates bank state only. Receipt creation, stock movement, and payment consumption continue through the existing idempotent sale transaction. A closed browser resumes completion when its original saved basket is opened again. Previously erased baskets cannot be reconstructed from an amount alone.

Minu request IDs are saved in the browser before authorization and invoices are saved in the database before contacting Minu. Retrying the same authorization identity returns the existing attempt. An uncertain invoice response stays pending. Conditional writes prevent late provider responses from downgrading approval or consumption. Transient sale submission failures reuse the same sale ID for up to three retries.

Closing the Minu waiting overlay continues checks in the background; it does not cancel a bank transaction. Unresolved Minu payments cannot be silently removed or reset. An explicit terminal decline releases the payment entry. Cash, QPay, non-Minu terminal processing, split calculations, and eBarimt issuance retain their existing paths.

Deploy the API before Vendor. Old Vendor clients remain compatible with the updated API. No schema migration or payment credential changes are required.

Validation covers RRN-less approval, delayed approval, provider outages, invoice mismatch, restoration, repeated authorization identity, stale status responses, server reconciliation, stock rollback, idempotent sale retry, concurrent payment consumption, and mixed card/QR/cash sales. Integration tests use a disposable local PostgreSQL database and a synthetic local Minu provider; they never charge a real terminal.
