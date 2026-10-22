# eSIM launch and pricing

Open **App Control → MGL → MGL eSIM** as ADMIN or SUPER_ADMIN.

- **Тун удахгүй** is the default, including when no settings row exists. All genuine supplier plans remain visible with no retail price. Draft prices are private and purchasing stays disabled.
- Select a country, enter each plan's final MNT selling price, and save. Switching countries retains edits. Empty prices withdraw that plan from the priced catalog.
- Select **Үнэ нийтлэх** and save to publish only plans with explicit prices. No app rebuild, server restart, exchange-rate refresh or deployment is needed for future retail price edits.
- Edit the customer announcement and approved purchase/refund terms in the same panel. These are loaded from the database, not environment variables.

Manual prices are final retail prices. The old calculated-pricing functions remain available for tools/tests, but the production eSIM router uses the reviewed prices in App Control. Manual retail pricing does not expose the experimental at-cost membership toggle.

Publishing prices is separate from accepting payment. The server also requires the existing `ESIM_CHECKOUT_ENABLED=true` gate, supplier access, signing/encryption secrets, Minu merchant credentials, approved refund terms, HTTPS callback origin and the reconciliation worker. The admin panel does not store API credentials. Keep checkout off during the marketing launch.

The dedicated settings endpoint uses optimistic revisions to reject stale concurrent edits. Generic site settings cannot overwrite or publicly expose draft eSIM settings. Catalog responses contain only published retail data. Quotes are signed, tied to the account, valid for five minutes and repriced before invoice creation. Existing orders retain their original amount and terms.
