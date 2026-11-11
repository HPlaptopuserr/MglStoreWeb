# MGL-299 eBarimt VAT rounding recovery — 2026-11-11

25 completed sales had explicit PosAPI ERROR responses: independently rounded item VAT did not equal VAT rounded on the sub-receipt total. Sale payments and inventory had already completed.

The Vendor issuer now allocates VAT in integer minor units. Each tax-type sub-receipt rounds once; item VAT uses deterministic largest-remainder allocation so header, group and items agree. Non-VAT merchants and exempt groups remain zero. City tax is excluded from the VAT-inclusive basis. The original sale totals, payments and quantities are unchanged. A receipt mutation never retries on another transport after a lost response.

The frozen recovery manifest contains only the 25 original receipts, their rejected fiscal IDs, one organization and one register. It never selects later sales. On that register, the Vendor POS checks the local PosAPI identity and rejected-receipt list before starting. Recovery waits for an empty checkout and pauses before the next receipt if a sale starts.

Before a local correction, the API locks the sale and persists `vatRecovery.state=SUBMITTED` and a unique request ID in its existing eBarimt metadata. Another browser cannot submit it again. The correction uses PosAPI's documented `inactiveId` field, linking the original fiscal receipt, and preserves all amounts and payments. No sale, payment, refund or inventory operation is called.

A successful PosAPI response is cached on the issuing browser until the API stores it. If attaching fails, retry only attaches that response; it never issues a second correction. Lost or uncertain fiscal responses remain SUBMITTED indefinitely, without automatic lease expiry. Reconcile them on the original PosAPI before any operator intervention. Never clear SUBMITTED just to retry.

Verify completion by querying only this manifest: all 25 must have `ebarimtStatus=SUCCESS` and `vatRecovery.state=COMPLETED`. A local rejected ID absent from the invalid list is skipped, not assumed missing. A cashier must refresh the deployed Vendor POS on the original till to run local recovery; the cloud server cannot reach that computer's localhost.

MGL TUGS separately had 21 completed CREDIT sales with no recorded eBarimt outcome. The existing receipt flow defers fiscal issuance until credit repayment; paid CASH/CARD/QPAY/MIXED sales had successful outcomes. These credit sales are not in this recovery manifest and must not be blindly reissued.

Primary PosAPI reference: https://developer.itc.gov.mn/detail/proj-1787042993564?item=api-1787209763945 (`inactiveId` corrects the prior fiscal receipt; `billIdSuffix` is a daily unique internal suffix).
