# Vendor PAX A35 Android PGW integration

Vendor uses the local Windows bridge to communicate with the bank's Android PGW
application over USB serial COM. The supplied `Android PGW API_eng.docx` describes
this protocol; it does not identify the A35 model, a Windows driver, baud rate, or
the accepted length/type of `data`. Confirm those details with the bank for the
installed payment application. This implementation covers retail purchase,
purchase cancellation, void, and end-of-shift settlement. Preauthorization,
completion, gift-card balance, and terminal wallet selection are outside this flow.

## Connect from Admin

The user flow is **Нэмэлт хэсэг → Vendor & POS (Section 05) → Vendor касс →
PAX A35 холбох**. This stays inside the existing per-register RETAIL list.

1. On an active, approved Vendor till, generate and copy the connection link.
2. On the cashier PC, open the installed Desktop icon **PAX A35 холбох**.
3. Paste the link once. The bridge receives its configuration and restarts.
4. Check **Холбогдсон** in Admin. Plug the A35 USB cable into that PC and install
   the bank's required PGW/USB driver first. A first-time bridge installation also
   prompts for the link, and creates the Desktop icon.

The short code expires after ten minutes and can be claimed only once, including
under concurrent requests. A replacement code invalidates the previous unclaimed
code. A lost claim response needs a new Admin code; the original code is not reused
as a way to retrieve a secret. Issuance configures API card mode, ANDROID_PGW, and
loopback bridge URL automatically. New installations use COM discovery by default.
Users do not edit secret, URL, or COM environment files for this flow.

Each register gets an independent credential generation. The database stores a
random salt and the hash of a pending code, not a plaintext bridge key. Configure
a server-only `POS_BRIDGE_PAIRING_SECRET` with at least 32 random characters for
new pairings. Do not change `JWT_SECRET` to enable pairing or expose either root
in `NEXT_PUBLIC_*` settings. Adding the dedicated root does not log users out.

New dedicated-root claims store a `v2:` salt prefix. Existing unprefixed bindings
continue deriving their original key from `JWT_SECRET`, even after the dedicated
root is added. Versioned bindings never fall back to JWT if the dedicated root is
missing or invalid. Keep each root stable while its bindings are in use; rotation
requires reconciling payments and explicitly pairing those devices again. There
is no fallback to a deployment-wide bridge key for an enrolled/revoked register.
Without a dedicated root, the legacy production requirement remains a non-default
JWT root of at least 32 characters. No database migration or bridge reinstall is
needed for this server-only root selection change.

The code/activation link is shown only in the issuing Admin panel. No bridge key
is exposed to Admin or Vendor JavaScript. The desktop exchanges it over HTTPS
(HTTP is accepted only for localhost development), storing private credentials,
stable device identity and generation-specific revocation state beside the local
payment journal. An old bridge process cannot overwrite freshly paired credentials
when its next heartbeat reports that the old key is invalid.

Signed heartbeats report cached device health once per minute, without interrupting
an active purchase. Admin marks the device offline after 150 seconds without a
fresh heartbeat; COM, terminal ID and version are optional diagnostic details.
Terminal ID appears after the terminal returns it during a payment. Admin can
revoke an idle device. Pending/unknown payments, unresolved terminal commands and
local unknown-operation guards block re-pair/revoke. Code claim, command preparation,
payment creation, heartbeat updates and revocation use the same per-register lock.

The database migration `20261121010000_pos_bridge_pairing` adds PosBridgeBinding.
It must be applied through the normal release process before the new endpoints
are used. Development validation applies it only to a disposable local database;
production uses the existing reviewed migration deployment process.

## Legacy and advanced configuration

The following manual configuration remains for existing, unenrolled bridges and
bank-specific serial settings. It is not part of the normal Admin pairing flow.

The API's `POS_BRIDGE_SHARED_SECRET` and cashier bridge's `BRIDGE_SHARED_SECRET`
must match. Keep the secret on the API and cashier PC; never put it in a
`NEXT_PUBLIC_*` variable or browser storage. Use a distinct installation/key per
independent deployment. For unenrolled legacy registers, the API setting is deployment-wide: installations
sharing it are in the same trust boundary. Do not copy an authorized pending
checkout to another bridge or replace a bridge's journal to retry a payment.

Example cashier `bridge.env` (replace COM3 with the actual Device Manager port):

```dotenv
BRIDGE_PROVIDER=android-pgw
BRIDGE_PORT=7420
BRIDGE_SHARED_SECRET=replace-with-the-api-shared-secret
ANDROID_PGW_PORT=COM3
ANDROID_PGW_BAUD_RATE=9600
ANDROID_PGW_DATA_BITS=8
ANDROID_PGW_STOP_BITS=1
ANDROID_PGW_PARITY=none
ANDROID_PGW_AMOUNT_MULTIPLIER=100
ANDROID_PGW_TIMEOUT_MS=120000
ANDROID_PGW_HEALTH_TIMEOUT_MS=4000
ANDROID_PGW_RESPONSE_IDLE_MS=700
ANDROID_PGW_APPEND_CRLF=false
```

The serial settings above are implementation defaults, not values specified by
the bank's document. Responses express amounts in minor units (1023 = ₮10.23).
The default purchase multiplier is 100; confirm the request unit on a test terminal
before accepting live payments. The adapter echoes the original attempt UUID as
`data`; verify that the terminal application accepts that format.

On Windows, build the distribution with
`pnpm --filter @mgl/pos-bridge package:windows`, then run the generated installer
on the cashier PC. The installer creates the pairing Desktop icon and prompts
for the Admin link when needed. For legacy manual setups, configure `bridge.env`,
restart the Scheduled Task, and check `http://127.0.0.1:7420/health` on that PC. Require `ok: true`,
`provider: android-pgw`, `protocolVersion: 2`, `signingEnabled: true`, and a
`CONNECTED` terminal reply. The installer checks terminal/signing readiness.

In Admin, select the Vendor RETAIL register, API card mode, `ANDROID_PGW`, and
`http://127.0.0.1:7420` as the bridge URL. Reload the Vendor till. Run bridge checks
from the cashier PC: localhost on an administrator's different PC is a different
machine. Grant the browser's local-network permission for the trusted Vendor site
if requested. Existing unenrolled registers retain their deployed health, unsigned
purchase and result contract, including old Vendor/Org/POS tabs. Cloud deployment
does not enroll registers or upgrade cashier PCs. Only deliberate Admin pairing
requires bridge protocol 2 and signed requests/results; settlement, void and
software cancellation commands are enabled only for paired Vendor registers.
Upgrade/reload that Vendor client and install the new bridge before pairing.
Org/POS clients require their own pairing support before enrolling their register.

## Payment evidence and retries

The API stores an attempt before issuing its request signature. Vendor relays
that signature to the bridge; it never receives the shared key. The bridge signs
the exact result body, including the original attempt, requested amount, and
requested terminal. The API authenticates this evidence before accepting approval
or decline. A browser transport error cannot declare that a bank transaction failed.

The adapter requires the documented response code and echoed `data`. For approval
it also requires the returned amount and terminal; returned values must match the
request (the optional `terminal-1` setting allows the terminal to identify itself).
RRNs, approval codes and terminal IDs retain leading zeroes. Nested settlement
JSON and echoed/fragmented serial commands are handled without accepting command
echoes as results.

Codes -21/-22 mean cancellation regardless of the description's language, provided
there is no conflicting approval/reference evidence. Documented refusals such as
insufficient funds and incorrect PIN decline. Transport, mismatch, storage, unknown
and duplicate-transaction responses remain unresolved, including 50, 52 and 913.
The document's word "unsuccessful" does not independently establish that no debit
occurred after a lost response or a terminal database failure.

Before touching hardware, the bridge durably reserves each operation. Concurrent
retries coalesce; an identical retry returns its stored result, including after
bridge restart. A changed amount/reference under the same operation identity is
rejected. An interrupted/unknown operation keeps the physical-terminal guard and
cannot automatically be dispatched again. Status recovery reads
`POST /charge/status`; it never starts a purchase. A saved approval can therefore
be forwarded to the API even if the terminal has subsequently disconnected.

Windows evidence is stored outside the installer directory at
`%LOCALAPPDATA%\MGLStore\pos-bridge-data`. `BRIDGE_DATA_DIR` can select another
durable, private directory. Preserve it during upgrades and keep one bridge process
per physical terminal. Do not delete `terminal.lock` or edit journal records to
make a pending payment retryable. Corrupt/unwritable evidence fails closed.

## Cancellation returns and shift closure

Vendor's PGW Cancel button writes `<{vendingCancel:"1"}>` on the active purchase
connection. The original payment stays pending until its final response arrives.
This is not a void of an already-approved transaction. If the bridge lost that
connection, verify the original bank transaction instead of charging again.

Terminal returns use the server-recorded purchase's RRN, not a browser-supplied
reference or Push ECR endpoint. A stable void identity prevents repeated refunds
when the page is retried. Split card payments are voided individually. Terminal
void does not itself return stock or issue an eBarimt return: Vendor proceeds with
the existing sale/fiscal return after all card voids succeed. An already settled
transaction may require the bank's separate refund process; the supplied PGW
document describes void, not every refund scenario.

PGW shift closure uses `<{settlement:true,data:...}>` with a stable identity tied
to that register's open shift. Closure stops when the signed settlement outcome
is not approved. Retrying a failed HTTP response reuses the recorded operation;
it does not independently settle the terminal again. Terminal operations are
audited separately from inventory and sale changes.

After a definitive signed void/settlement decline, a deliberate retry obtains a
new identity derived from that authenticated decline. Vendor retains this proof
in session storage when available. An approval, unknown result, or browser-supplied
claim cannot authorize a new operation identity.

The supplied document contains no purchase-status inquiry command. If both the
terminal response and durable result are missing, the bank must reconcile the
terminal journal, RRN, amount and time before support resolves the pending attempt
and terminal guard. The implementation intentionally has no automatic "mark paid"
or "retry charge" escape for that uncertainty.

## Local verification

```sh
pnpm --filter @mgl/types build
pnpm --filter @mgl/pos-bridge test
pnpm --filter @mgl/vendor test
pnpm --filter @mgl/api test
pnpm --filter @mgl/pos-bridge --filter @mgl/api --filter @mgl/vendor type-check
pnpm --filter @mgl/pos-bridge test:serial
```

`test:serial` needs Python 3 on macOS/Linux. It runs the real serial binding against
an explicit virtual PTY, with synthetic approval, void, settlement and cancellation
responses. It does not enumerate real USB terminals or contact a bank. Unit tests
also cover signing, forged evidence, response correlation, unknown outcomes,
concurrency, journal corruption and restart recovery. The Vendor Node test loader
handles CSS modules for React markup tests; production CSS behavior is unchanged.

Pairing integration additionally runs `bridge-pairing.integration.test.ts` with
`BRIDGE_PAIRING_INTEGRATION=1` against a disposable localhost database whose name
starts `mgl_bridge_pairing_test_`. It covers actual bridge provisioning/heartbeat
clients, concurrent one-use claims, cross-register key rejection, code expiry,
revocation, and heartbeat-vs-pairing races. Its migration SQL is checked separately
against that same disposable schema.

The earlier payment database integration tests only enable against a disposable localhost PostgreSQL
database whose name starts `mgl_card_recovery_test_`. After creating its schema,
run the existing recovery suite with `CARD_RECOVERY_INTEGRATION=1` and the new
signed PGW suite with `PGW_INTEGRATION=1`, both using that explicit `DATABASE_URL`.
The new file is `android-pgw.integration.test.ts`. Drop only that disposable test
database afterward.

Physical A35 acceptance still needs the bank's installed application, approved
USB driver, actual Windows startup, a test card, amount-unit checks, cancellation,
lost-response recovery and bank/fiscal journal reconciliation. Local simulation
does not replace those device checks. No deployment is performed by these tests.
